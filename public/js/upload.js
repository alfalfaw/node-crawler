const btn_change = document.querySelector("#btn-change");
const btn_submit = document.querySelector("#btn-submit");
const input = document.querySelector("#input-text-or-file");
const ul = document.querySelector(".file__list ul");
const socket = io();

function addDeleteListener(btn) {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    let data = new FormData();
    data.append("name", btn.getAttribute("data-name"));
    axios.post("file/delete", data).then((res) => {
      if (res.data.status === "ok") {
        window.location.href = res.data.redirect_url;
      }
    });
  });
}
socket.on("complete", (upload_id, size) => {
  // console.log(`${upload_id}离线下载成功`);
  document.getElementById(upload_id).innerHTML = `${size}`;
});
socket.on("uploadStart", (upload_id, name, time) => {
  input.value = "";
  let li = document.createElement("li");
  li.classList.add("list-group-item", "clearfix", "new-item");
  li.innerHTML = `
  <a class="pull-left" href="/file/download/${name}">
  <span class="text-info">${name}</span>
  <span class="text-plain" id=${upload_id}>0/0</span>
  <span>${time}</span>
</a>
<a class="delete pull-right" href="#" data-name="${name}">
    <i class="fa fa-trash" aria-hidden="true"></i>
</a>
  `;
  console.log(upload_id);

  addDeleteListener(li.children[1]);
  ul.prepend(li);
});
socket.on("progressUpdate", (upload_id, receive, total) => {
  // console.log(`${receive}/${total}`);
  document.getElementById(upload_id).innerHTML = `${receive}/${total}`;
});

btn_change.addEventListener("click", (e) => {
  // 阻止默认行为
  e.preventDefault();
  if (input.type === "text") {
    input.value = "";
    input.type = "file";
    input.name = "file";
    e.currentTarget.innerHTML = "URL";
  } else {
    input.value = "";
    input.type = "text";
    input.name = "url";
    e.currentTarget.innerHTML = "浏览";
  }
});
btn_submit.addEventListener("click", (e) => {
  // 获取进度条
  let progress_bar = document.getElementById("progress-bar");

  e.preventDefault();
  let data = new FormData();
  // const url = window.location.protocol + window.location.host + "/file/upload";
  // console.log(url);
  const path = "/file/upload";

  if (input.type === "text") {
    socket.emit("upload", { url: input.value });
    return false;
  }

  data.append("file", input.files[0]);
  input.setAttribute("disabled", true);
  const options = {
    onUploadProgress: (progressEvent) => {
      const { loaded, total } = progressEvent;
      let percent = Math.floor((loaded / total) * 100);
      // console.log(`${loaded}kb of ${total}kb | ${percent}%`);
      progress_bar.style.width = `${percent}%`;
    },
  };
  axios.post(path, data, options).then((res) => {
    if (res.data.status === "ok") {
      window.location.href = res.data.redirect_url;
    }
  });
  // console.log(data.get("url"));
});

// btn_delete.addEventListener("click", (e) => {
//   e.preventDefault();
//   prompt("dokdk", "dks");
// });

const delete_btns = document.querySelectorAll(".delete");
delete_btns.forEach((btn) => {
  addDeleteListener(btn);
});
