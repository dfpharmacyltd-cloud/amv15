export async function svgToPng(svg: SVGSVGElement, scale = 3): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const vb = svg.viewBox.baseVal;
  const w = vb.width || 340, h = vb.height || 175;
  
  if (w === 0 || h === 0) {
    throw new Error('SVG dimensions cannot be 0x0');
  }

  clone.setAttribute("width", String(w));      
  clone.setAttribute("height", String(h));     
  
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  const img = new Image();
  
  await new Promise((ok, err) => { 
    img.onload = ok; 
    img.onerror = err; 
    img.src = url; 
  });
  
  const c = document.createElement("canvas");
  c.width = w * scale; 
  c.height = h * scale;
  const ctx = c.getContext("2d")!;
  
  // Fill white background (Word compatibility)
  ctx.fillStyle = "#ffffff"; 
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  
  URL.revokeObjectURL(url);
  
  return new Promise((res, rej) => {
    c.toBlob(b => {
      if (b) res(b);
      else rej(new Error('Canvas toBlob failed'));
    }, "image/png");
  });
}
