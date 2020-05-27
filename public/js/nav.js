const currentPath = window.location.pathname;
const li = document.querySelector("#topbar a[href='" + currentPath + "']")
  .parentNode;
li.classList.add("active");
