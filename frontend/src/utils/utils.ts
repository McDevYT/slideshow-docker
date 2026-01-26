export const isVideo = (filename: string) =>
  /\.(mp4|webm|ogg|mov)$/i.test(filename);

export const isImage = (filename: string) =>
  /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(filename);
