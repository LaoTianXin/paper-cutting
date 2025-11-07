// Type definitions for @techstark/opencv-js
declare module "@techstark/opencv-js" {
  export interface Mat {
    delete(): void;
    clone(): Mat;
    roi(rect: Rect): Mat;
    rows: number;
    cols: number;
    data:
      | Uint8Array
      | Int8Array
      | Uint16Array
      | Int16Array
      | Int32Array
      | Float32Array
      | Float64Array;
  }

  export interface Size {
    width: number;
    height: number;
  }

  export interface Point {
    x: number;
    y: number;
  }

  export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface RectVector {
    size(): number;
    get(index: number): Rect;
    delete(): void;
  }

  export interface CascadeClassifier {
    load(filename: string): boolean;
    detectMultiScale(
      image: Mat,
      objects: RectVector,
      scaleFactor?: number,
      minNeighbors?: number,
      flags?: number,
      minSize?: Size,
      maxSize?: Size
    ): void;
    delete(): void;
  }

  export interface FileSystem {
    createDataFile(
      parent: string,
      name: string,
      data: Uint8Array,
      canRead: boolean,
      canWrite: boolean,
      canOwn: boolean
    ): void;
  }

  interface CV {
    Mat: new () => Mat;
    Size: new (width: number, height: number) => Size;
    Point: new (x: number, y: number) => Point;
    Rect: new (x: number, y: number, width: number, height: number) => Rect;
    RectVector: new () => RectVector;
    CascadeClassifier: new () => CascadeClassifier;

    imread(imageSource: HTMLImageElement | HTMLCanvasElement | string): Mat;
    imshow(canvas: HTMLCanvasElement | null, mat: Mat): void;
    cvtColor(src: Mat, dst: Mat, code: number, dstCn?: number): void;
    rectangle(
      img: Mat,
      pt1: Point,
      pt2: Point,
      color: number[] | [number, number, number, number],
      thickness?: number
    ): void;
    putText(
      img: Mat,
      text: string,
      org: Point,
      fontFace: number,
      fontScale: number,
      color: number[] | [number, number, number, number],
      thickness?: number
    ): void;
    resize(
      src: Mat,
      dst: Mat,
      dsize: Size,
      fx?: number,
      fy?: number,
      interpolation?: number
    ): void;

    COLOR_RGBA2GRAY: number;
    FONT_HERSHEY_SIMPLEX: number;
    INTER_LINEAR: number;

    FS_createDataFile: FileSystem["createDataFile"];

    matFromImageData(imageData: ImageData): Mat;
  }

  const cv: CV;
  export default cv;

  // 导出命名空间以支持 cv.CascadeClassifier 语法
  export { CV as cv };
}
