/** Runs async tasks with at most `concurrency` in flight; a failure does not stop the rest. */
export async function runQueue<T>(
  tasks: readonly (() => Promise<T>)[],
  concurrency: number,
  onSettled?: (index: number, result: PromiseSettledResult<T>) => void,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  let next = 0
  async function worker() {
    while (next < tasks.length) {
      const index = next++
      try {
        results[index] = { status: 'fulfilled', value: await tasks[index]() }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
      onSettled?.(index, results[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker))
  return results
}
