export const fmtDate = (d: Date) =>
  `${String(d.getDate()).padStart(2,"0")}-${
    ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]
  }-${d.getFullYear()}`;
