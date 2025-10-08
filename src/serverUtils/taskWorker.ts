import { parentPort, threadId } from 'worker_threads';

/**
 * Worker Thread for CPU-Intensive Tasks
 * 
 * This file runs in a separate thread from the main application.
 * It receives tasks, processes them, and sends results back.
 * This keeps the main thread responsive even during heavy computations.
 */

// Interface for the data we expect to receive
interface TaskData {
  number: number;
}

/**
 * Example CPU-intensive function: Calculate Fibonacci number
 * This is intentionally inefficient to demonstrate the benefits of worker threads
 * In production, you'd use a more efficient algorithm
 */
function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

function factorial(n: number, memo: Map<number, number> = new Map()): number {
  if (n <= 1) return 1;
  
  if (memo.has(n)) {
    return memo.get(n)!;
  }
  
  const result = n * factorial(n - 1, memo);
  memo.set(n, result);
  return result;
}

/**
 * Another example: Prime number checker
 * Useful for demonstrating parallel processing capabilities
 */
function isPrime(num: number): boolean {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;
  
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
  }
  return true;
}

/**
 * Process the task received from the main thread
 */
function processTask(data: TaskData): any {
  const { number } = data;
  
  // Perform the calculation
  const fibResult = fibonacci(number);
  const factorialResult = factorial(number);
  const primeCheck = isPrime(number);
  
  // You can perform multiple operations here
  // All running in this separate thread
  return {
    input: number,
    factorial: factorialResult,
    fibonacci: fibResult,
    isPrime: primeCheck,
    threadId,
  };
}

// Listen for messages from the main thread
// parentPort is the communication channel between main thread and worker
if (parentPort) {
  parentPort.on('message', (data: TaskData) => {
    try {
      // Process the task
      const result = processTask(data);
      
      // Send the result back to the main thread
      parentPort!.postMessage({ success: true, result });
      
    } catch (error) {
      // If something goes wrong, send the error back
      parentPort!.postMessage({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
} else {
  console.error('This file must be run as a Worker thread');
}