export default function sleep(duration?: number): Promise<void> {
  return typeof duration === 'number'
    ? new Promise(resolve => setTimeout(() => resolve(), duration))
    : Promise.resolve();
}
