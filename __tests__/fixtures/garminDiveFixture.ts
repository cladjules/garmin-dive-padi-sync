import { FitBaseType, FitEncoder } from "fit-file-parser/encoder";

function semicircles(degrees: number): number {
  return Math.round((degrees * 2 ** 31) / 180);
}

export function createGarminDiveFit(offsetSeconds = 0): Uint8Array {
  const encoder = new FitEncoder();
  const offsetMilliseconds = offsetSeconds * 1000;
  const start = new Date(new Date("2023-11-22T14:44:47.000Z").valueOf() + offsetMilliseconds);
  const end = new Date(new Date("2023-11-22T15:37:32.000Z").valueOf() + offsetMilliseconds);
  const localEnd = new Date(new Date("2023-11-22T11:37:32.000Z").valueOf() + offsetMilliseconds);

  encoder.writeMessage(
    0,
    [
      { baseType: FitBaseType.Enum, number: 0, size: 1, value: 4 },
      { baseType: FitBaseType.Uint16, number: 1, size: 2, value: 1 },
      {
        baseType: FitBaseType.Uint32,
        number: 4,
        size: 4,
        value: FitEncoder.toFitTimestamp(start),
      },
    ],
    0,
  );

  encoder.writeMessage(
    18,
    [
      {
        baseType: FitBaseType.Uint32,
        number: 253,
        size: 4,
        value: FitEncoder.toFitTimestamp(end),
      },
      {
        baseType: FitBaseType.Uint32,
        number: 2,
        size: 4,
        value: FitEncoder.toFitTimestamp(start),
      },
      { baseType: FitBaseType.Enum, number: 5, size: 1, value: 53 },
      { baseType: FitBaseType.Enum, number: 6, size: 1, value: 54 },
      { baseType: FitBaseType.Uint32, number: 7, size: 4, value: 3_164_570 },
      { baseType: FitBaseType.Uint32, number: 8, size: 4, value: 3_164_570 },
      { baseType: FitBaseType.Sint32, number: 38, size: 4, value: semicircles(13.8662216) },
      { baseType: FitBaseType.Sint32, number: 39, size: 4, value: semicircles(-61.0788454) },
      { baseType: FitBaseType.Sint8, number: 58, size: 1, value: 29 },
      { baseType: FitBaseType.Sint8, number: 150, size: 1, value: 28 },
    ],
    1,
  );

  encoder.writeMessage(
    34,
    [
      {
        baseType: FitBaseType.Uint32,
        number: 253,
        size: 4,
        value: FitEncoder.toFitTimestamp(end),
      },
      {
        baseType: FitBaseType.Uint32,
        number: 5,
        size: 4,
        value: FitEncoder.toFitTimestamp(localEnd),
      },
      { baseType: FitBaseType.Uint32, number: 0, size: 4, value: 3_164_570 },
      { baseType: FitBaseType.Uint16, number: 1, size: 2, value: 1 },
      { baseType: FitBaseType.Enum, number: 2, size: 1, value: 0 },
      { baseType: FitBaseType.Enum, number: 3, size: 1, value: 26 },
      { baseType: FitBaseType.Enum, number: 4, size: 1, value: 1 },
    ],
    2,
  );

  encoder.writeMessage(
    259,
    [
      { baseType: FitBaseType.Uint8, number: 0, size: 1, value: 0 },
      { baseType: FitBaseType.Uint8, number: 1, size: 1, value: 21 },
      { baseType: FitBaseType.Enum, number: 2, size: 1, value: 1 },
      { baseType: FitBaseType.Enum, number: 3, size: 1, value: 0 },
    ],
    3,
  );

  encoder.writeMessage(
    268,
    [
      {
        baseType: FitBaseType.Uint32,
        number: 253,
        size: 4,
        value: FitEncoder.toFitTimestamp(end),
      },
      { baseType: FitBaseType.Uint16, number: 0, size: 2, value: 18 },
      { baseType: FitBaseType.Uint16, number: 1, size: 2, value: 0 },
      { baseType: FitBaseType.Uint32, number: 2, size: 4, value: 11_291 },
      { baseType: FitBaseType.Uint32, number: 3, size: 4, value: 17_646 },
      { baseType: FitBaseType.Uint32, number: 10, size: 4, value: 803 },
      { baseType: FitBaseType.Uint32, number: 11, size: 4, value: 3_103_527 },
    ],
    4,
  );

  encoder.writeMessage(
    323,
    [
      {
        baseType: FitBaseType.Uint32,
        number: 253,
        size: 4,
        value: FitEncoder.toFitTimestamp(end),
      },
      { baseType: FitBaseType.Uint32z, number: 0, size: 4, value: 1_234_567_890 },
      { baseType: FitBaseType.Uint16, number: 1, size: 2, value: 22_359 },
      { baseType: FitBaseType.Uint16, number: 2, size: 2, value: 6_529 },
    ],
    5,
  );

  return encoder.close();
}
