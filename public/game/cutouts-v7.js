// Same edge-connected background treatment used by the player atlas.
// Keep enclosed pale pixels (hair, eyes, shirt and feathers) intact.
export function loadCutout(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width, height } = pixels;
      const visited = new Uint8Array(width * height), queue = new Uint32Array(width * height);
      let head = 0, tail = 0;
      function add(index) {
        if (visited[index]) return;
        visited[index] = 1;
        const p = index * 4, lo = Math.min(data[p], data[p + 1], data[p + 2]);
        const hi = Math.max(data[p], data[p + 1], data[p + 2]);
        if (data[p + 3] > 0 && (lo < 90 || hi - lo > 24)) return;
        queue[tail++] = index;
      }
      for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
      for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
      while (head < tail) {
        const index = queue[head++]; data[index * 4 + 3] = 0;
        const x = index % width;
        if (x) add(index - 1);
        if (x < width - 1) add(index + 1);
        if (index >= width) add(index - width);
        if (index < width * (height - 1)) add(index + width);
      }
      ctx.putImageData(pixels, 0, 0); resolve(canvas);
    };
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });
}
