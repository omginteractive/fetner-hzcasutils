import hasProperty from './hasProperty';

export default function getTouchAt(
  from: TouchList,
  index: number,
): Touch | null {
  return hasProperty(from, 'item') ? from.item(index) : from[index];
}
