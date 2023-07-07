import { Capacitor } from "@capacitor/core";
import { Geolocation } from '@capacitor/geolocation';
import { App as CapacitorApp } from '@capacitor/app';


CapacitorApp.addListener('backButton', ({canGoBack}) => {
  if(!canGoBack){
    CapacitorApp.exitApp();
  } else {
    window.history.back();
  }
});

var prism = {};
window.prism = prism;

prism.Form = function () {
  this.errors = [];
  this.addError = function (field, message) {
    this.errors.push({ field, message });
  }
  this.showErrors = function () {
    this.errors.forEach((err) => {
      const div = document.createElement('div');
      div.append(err.message);
      err.field.parentElement.append(div);
      err.field.parentElement.classList.add('error');
    });
  }
  this.hideErrors = function () {
    for (const err of this.errors) {
      err.field.parentElement.classList.remove('error');
      const messages = [...err.field.parentElement.getElementsByTagName('div')]
      for (const div of messages) {
        div.remove()
      }
    }
    this.errors.length = 0;
  }
};

function NavigatorGeo () {
  this.watchId = null;
  this.startWatch = function (callback) {
    if (navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        callback,
        () => {
          prism.showMessage("Error: The geolocation service failed.");
        }, {
        maximumAge: 0,
        timeout: 30 * 1000,
        enableHighAccuracy: true
      });
    } else {
      prism.showMessage("Error: Your browser doesn't support geolocation.");
    }
  }
  this.stopWatch = function () {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
  this.distanceInMeters = function (p1, p2) {
    let dist = Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2))
    dist = dist * 60;
    return dist * 1852;
  };
};

function CapacitorGeo() {
  this.watchId = null;
  this.startWatch = async function (callback) {
    this.watchId = await Geolocation.watchPosition({
      maximumAge: 0,
      timeout: 30 * 1000,
      enableHighAccuracy: true
    },
    (position, err) => {
      if (err) {
        prism.showMessage(`Error: ${err}`);
      } else if (position && typeof callback === 'function') {
        callback(position);
      }
    });
  }
  this.stopWatch = async function () {
    if (this.watchId) {
      await Geolocation.clearWatch({id: this.watchId});
      this.watchId = null;
    }
  }
  this.distanceInMeters = function (p1, p2) {
    let dist = Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2))
    dist = dist * 60;
    return dist * 1852;
  };
}

prism.Geolocation = function() {
  if (Capacitor && Capacitor.isNativePlatform) {
    return new CapacitorGeo();
  } else {
    return new NavigatorGeo();
  }
}

prism.showMessage = function (message, buttonText, callback) {
  const html = `<div class="backdrop">
    <div class="modal">
      <div class="content">
      </div>
      <div class="footer">
        <button class="btn btnDefault">Ok</button>
      </div>
    </div>
  </div>`;
  const body = document.querySelector('body');
  body.insertAdjacentHTML('beforeend', html);

  const modal = document.querySelector('.modal');
  setTimeout(() => modal.classList.add('visible'), 20);

  const content = document.querySelector('.content');
  content.innerText = message;

  const btn = document.querySelector('.modal .btnDefault');
  if (buttonText) {
    btn.innerText = buttonText;
  }
  btn.addEventListener('click', () => {
    modal.classList.remove('visible');
    setTimeout(() => {
      const backdrop = document.querySelector('.backdrop');
      backdrop.remove();
      if (callback) {
        callback();
      }
    }, 200);
  });
};

prism.getParamFromUrl = function (param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
};

prism.paramInUrl = function (param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has(param);
};

prism.progressBar = function (objName, totalTime, callBackFinish) {
  let progressbar = document.getElementById(objName);
  const valor = progressbar.value;
  if (valor == 100) callBackFinish();
  else {
    progressbar.value = valor + 1;
    setTimeout(
      progressBar,
      totalTime / 100,
      objName,
      totalTime,
      callBackFinish
    );
  }
};

prism.onChangeFileImage = function (file, image) {
  const fileElement = document.getElementById(file);
  const imageElement = document.getElementById(image);
  const [selectedFile] = fileElement.files;
  if (selectedFile) {
    const reader = new FileReader();
    reader.readAsArrayBuffer(selectedFile);
    reader.onloadend = function () {
      const imgBase64 = btoa(String.fromCharCode.apply(null, new Uint8Array(reader.result)));
      imageElement.src = `data:image/png;base64, ${imgBase64}`;
    };
  }
}

prism.getImageValueInBase64 = function (image) {
  const imageElement = document.getElementById(image);
  const pos = imageElement.src.indexOf('base64');
  if (pos > -1)
    return imageElement.src.substr(pos + 8);
  else
    return '';
}

prism.RestApi = function (baseUrl) {
  this.request = function (method, url, body, success, error) {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      try {
        if (this.readyState == 4) {
          let resp = JSON.parse(xhttp.response || "null");
          if (!resp) resp = xhttp.response;
          if (this.status == 200) {
            success(resp);
          } else if (this.status == 400) {
            error(resp.message || resp || "Bad Request", this.status);
          } else if (this.status == 401) {
            error("Unauthorized", this.status);
          } else if (this.status == 403) {
            error("Forbidden", this.status);
          } else if (this.status == 404) {
            error("Not Found", this.status);
          } else if (this.status == 500) {
            error("Internal server error", this.status);
          } else {
            error("Undefined error", this.status);
          }
        }
      } catch (err) {
        error(err.message, 0);
      }
    };
    xhttp.open(method, baseUrl + url, true);
    let jwtoken = localStorage.getItem("autentication");
    if (jwtoken) {
      try {
        jwtoken = JSON.parse(jwtoken);
        if (jwtoken && jwtoken.access_token)
          xhttp.setRequestHeader("Authorization", "Bearer " + jwtoken.access_token);
      }
      catch (err) { }
    }
    xhttp.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
    /*** fallbacks for IE and older browsers: ***/
    //xhttp.setRequestHeader("Expires", "Tue, 01 Jan 1980 1:00:00 GMT");
    //xhttp.setRequestHeader("Pragma", "no-cache");
    xhttp.setRequestHeader("Content-type", "application/json");
    try {
      if (!body) xhttp.send();
      else xhttp.send(JSON.stringify(body));
    } catch (err) {
      error(err.message, 0);
    }
  };
  function errorCallback(data, status) {
    console.error(`${status} ${data}`);
    if (data.message) prism.showMessage(data.message);
    else prism.showMessage(`${status} ${data}`);
  };
  this.httpPost = function (url, body, successCallback) {
    this.request("POST", url, body, successCallback, errorCallback);
  };
  this.httpPut = function (url, body, successCallback) {
    this.request("PUT", url, body, successCallback, errorCallback);
  };
  this.httpGet = function (url, successCallback) {
    this.request("GET", url, null, successCallback, errorCallback);
  };
  this.httpDelete = function (url, successCallback) {
    this.request("DELETE", url, null, successCallback, errorCallback);
  };
};

prism.Table = function (table, columns, operations) {
  let tbody = null;
  let filterContent = null;
  let values = [];
  let lastIndexColSort = -1;
  let lastDirectionSort = false;
  init();

  function init() {
    table.deleteTHead();
    const header = table.createTHead();
    const row = header.insertRow();
    columns.forEach((col, index) => {
      const cell = row.insertCell();
      if (col.Label) cell.innerHTML = col.Label;
      if (col.Type) {
        const type = col.Type.toLowerCase()
        if (type == 'currency' || type == 'real' || type == 'int') {
          cell.style.textAlign = 'right';
        } else if (type == 'select') {
          const input = document.createElement('input');
          cell.appendChild(input);
          input.type = 'checkbox'
          input.addEventListener('change', (e) => {
            const objs = [];
            for (const row of tbody.querySelectorAll(`tr:not([style*="display: none"])`)) {
              objs.push(row.obj);
              const input = row.querySelector('input');
              input.checked = e.target.checked;
            }
            if (col.onchange && typeof col.onchange == 'function') {
              col.onchange({
                scope: 'all',
                checked: e.target.checked,
                value: objs
              });
            }
          });
        }
      }
      if (col.Width) cell.style.width = `${col.Width}px`;
      if (col.Align) cell.style.textAlign = col.Align;
      if (!col.Type || col.Type !== 'select') {
        cell.addEventListener('click', () => {
          if (lastIndexColSort != index) {
            lastDirectionSort = true;
            lastIndexColSort = index;
          } else if (lastDirectionSort) {
            lastDirectionSort = !lastDirectionSort;
          } else if (!lastDirectionSort) {
            lastIndexColSort = -1;
          }
          sortByColumnIndex(lastIndexColSort, lastDirectionSort);
        });
      }
    });
    operations.forEach(() => {
      const cell = row.insertCell();
      cell.innerHTML = "";
    });
    tbody = table.createTBody();
  };

  function clearRows () {
    for (let index = values.length; index > 0; index--)
      table.deleteRow(index);
  };
  this.setRows = function(data) {
    clearRows();
    values = [...data];
    for (const obj of data) addRow(obj);
    if (lastIndexColSort >= 0)
      sortByColumnIndex(lastIndexColSort, lastDirectionSort);
  };
  function adjustColumnName(col, obj) {
    if (!col.Field || col.Field in obj) {
      return;
    }
    const name = col.Field.replace(/[^a-z0-9]/gi, '').toLowerCase();
    for (const prop in obj)
      if (name == prop.replace(/[^a-z0-9]/gi, '').toLowerCase()) {
        col.Field = prop;
        return;
      }
  }
  function formatCurrency(value, symbol) {
    return `${symbol} ${formatReal(value, 2)}`;
  }
  function formatReal(value, digits) {
    if (!value)
      value = 0;
    return parseFloat(value).toFixed(digits);
  }
  function formatInt(value) {
    if (!value)
      value = 0;
    return parseInt(value).toString();
  }
  function formatDate(value) {
    if (!value)
      value = new Date("");
    else if (typeof value == 'string')
      value = new Date(value);
    return value.toLocaleDateString()
  }
  function formatDateTime(value) {
    if (!value)
      value = new Date("");
    else if (typeof value == 'string')
      value = new Date(value);
    return value.toLocaleString()
  }
  function addRow(obj) {
    const row = tbody.insertRow();
    row.obj = obj;
    for (const col of columns) {
      const cell = row.insertCell();
      adjustColumnName(col, obj);
      if (col.Type) {
        const type = col.Type.toLowerCase();
        if (type == 'img') {
          cell.innerHTML = `<img src='${obj[col.Field]}' width='${col.Width}px' height='${col.Width}px' onerror='if (this.src != "./foto/notfound.png") this.src = "./foto/notfound.png";'/>`;
        } else if (type == 'currency') {
          cell.innerHTML = formatCurrency(obj[col.Field], col.Symbol);
          cell.style.textAlign = 'right';
        } else if (type == 'int') {
          cell.innerHTML = formatInt(obj[col.Field]);
          cell.style.textAlign = 'right';
        } else if (type == 'real') {
          cell.innerHTML = formatReal(obj[col.Field], col.Digits);
          cell.style.textAlign = 'right';
        } else if (type == 'date') {
          cell.innerHTML = formatDate(obj[col.Field]);
        } else if (type == 'datetime') {
          cell.innerHTML = formatDateTime(obj[col.Field]);
        } else if (type == 'select') {
          const input = document.createElement('input');
          cell.appendChild(input);
          input.type = 'checkbox'
          input.addEventListener('change', (e) => {
            const inputs = [...tbody.querySelectorAll('tr:not([style*="display: none"]) input')];
            const inputAll = table.tHead.querySelector('input');
            if (inputs.every(i => i.checked == e.target.checked)) {
              inputAll.checked = e.target.checked;
            } else {
              inputAll.checked = false;
            }
            if (col.onchange && typeof col.onchange == 'function') {
              col.onchange({
                scope: 'single',
                checked: e.target.checked, 
                value: [obj]
              });
            }
          });
        }
      } else {
        cell.innerHTML = obj[col.Field];
      }
      if (col.Width) cell.style.width = `${col.Width}px`;
      if (col.Align) cell.style.textAlign = col.Align;
    }
    for (const col of operations) {
      const cell = row.insertCell();
      const btn = document.createElement("button");
      cell.appendChild(btn);
      btn.classList = "tool-btn " + col.Class;
      btn.title = col.Label;
      btn.addEventListener('click', () => {
        if (col.Action && typeof col.Action == 'function')
          col.Action(obj);
      });
    }
  };
  function passFilter(obj) {
    if (!filterContent) {
      return true;
    }
    for (const col of columns)
      if (obj[col.Field] && obj[col.Field].toString().toLowerCase().includes(filterContent))
        return true;
    return false;
  };
  this.filter = function(content) {
    filterContent = content.toLowerCase();
    for (const row of tbody.children) {
      const input = row.querySelector('input[type="checkbox"]');
      if (passFilter(row.obj)) {
        row.style = "display: ;";
      } else {
        row.style = "display: none;";
        if (input && input.checked) {
          input.checked = false;
        }
      }
      if (input) {
        input.dispatchEvent(new Event('change'));
      }
    }
  };
  function sortByKeyAsc(array, key) {
    return array.sort(function (a, b) {
      var x = a[key];
      var y = b[key];
      return x < y ? -1 : x > y ? 1 : 0;
    });
  }
  function sortByKeyDes(array, key) {
    return array.sort(function (a, b) {
      var x = a[key];
      var y = b[key];
      return x < y ? 1 : x > y ? -1 : 0;
    });
  }
  let sortByColumnIndex = (indexCol, asc) => {
    lastIndexColSort = indexCol;
    lastDirectionSort = asc;
    const sortedValues = [...values];
    if (indexCol >= 0) {
      asc
        ? sortByKeyAsc(sortedValues, columns[indexCol].Field)
        : sortByKeyDes(sortedValues, columns[indexCol].Field);
    }
    clearRows()
    for (const obj of sortedValues) addRow(obj);
    this.filter(filterContent);
  };
  this.getSelectedRows = function() {
    const result = [];
    for (const row of tbody.querySelectorAll(`tr:not([style*="display: none"]):has(input:checked)`)) {
      result.push(row.obj);
    }
    return result;
  }
};
