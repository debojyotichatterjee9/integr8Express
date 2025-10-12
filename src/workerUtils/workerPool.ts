import { Worker } from 'worker_threads';
import path from 'path';
import loggernaut from 'loggernaut';

/**
 * Worker Pool Manager
 * 
 * This class manages a pool of worker threads, allowing us to reuse threads
 * for multiple tasks instead of creating and destroying them repeatedly.
 * This is much more efficient and provides better performance.
 */

interface QueuedTask {
  data: any;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private freeWorkers: Worker[] = [];
  private taskQueue: QueuedTask[] = [];
  private workerPath: string;
  private poolSize: number;

  /**
   * Initialize the worker pool
   * @param workerPath - Absolute path to the worker script
   * @param poolSize - Number of worker threads to maintain
   */
  constructor(workerPath: string, poolSize: number = 4) {
    this.workerPath = workerPath;
    this.poolSize = poolSize;
    
    // Create all serverUtils upfront
    // This might seem wasteful, but it's actually more efficient than
    // creating them on-demand for most use cases
    this.initializeWorkers();
  }

  /**
   * Create and configure worker threads
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.poolSize; i++) {
      this.createWorker();
    }
    loggernaut.info(`Worker pool initialized with ${this.poolSize} workers`);
  }

  /**
   * Create a single worker and set up its event handlers
   */
  private createWorker(): void {
    const worker = new Worker(this.workerPath);
    
    // When a worker completes its task, make it available again
    worker.on('message', (result) => {
      this.handleWorkerResult(worker, result);
    });

    // Handle worker errors gracefully
    worker.on('error', (error) => {
      console.error('Worker error:', error);
      // Remove the failed worker and create a replacement
      this.handleWorkerError(worker, error);
    });

    // Handle unexpected worker exits
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
        this.handleWorkerExit(worker);
      }
    });

    // Add to our collections
    this.workers.push(worker);
    this.freeWorkers.push(worker);
  }

  /**
   * Handle the result from a worker thread
   */
  private handleWorkerResult(worker: Worker, result: any): void {
    // Worker is now free to take on new tasks
    this.freeWorkers.push(worker);
    
    // Check if there are queued tasks waiting for a worker
    if (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift()!;
      this.executeTask(task);
    }
  }

  /**
   * Handle worker errors by replacing the failed worker
   */
  private handleWorkerError(worker: Worker, error: Error): void {
    // Remove the problematic worker
    this.removeWorker(worker);
    
    // Create a replacement worker to maintain pool size
    this.createWorker();
  }

  /**
   * Handle unexpected worker exits
   */
  private handleWorkerExit(worker: Worker): void {
    this.removeWorker(worker);
    this.createWorker();
  }

  /**
   * Remove a worker from our collections
   */
  private removeWorker(worker: Worker): void {
    const workerIndex = this.workers.indexOf(worker);
    if (workerIndex !== -1) {
      this.workers.splice(workerIndex, 1);
    }

    const freeIndex = this.freeWorkers.indexOf(worker);
    if (freeIndex !== -1) {
      this.freeWorkers.splice(freeIndex, 1);
    }
  }

  /**
   * Execute a task using an available worker
   */
  private executeTask(task: QueuedTask): void {
    if (this.freeWorkers.length === 0) {
      // No serverUtils available, queue the task
      this.taskQueue.push(task);
      return;
    }

    // Get an available worker
    const worker = this.freeWorkers.pop()!;

    // Set up one-time message handler for this specific task
    const messageHandler = (result: any) => {
      worker.removeListener('message', messageHandler);
      
      if (result.success) {
        task.resolve(result.result);
      } else {
        task.reject(new Error(result.error));
      }
    };

    worker.on('message', messageHandler);

    // Send the task to the worker
    worker.postMessage(task.data);
  }

  /**
   * Public method to run a task
   * Returns a Promise that resolves when the task completes
   */
  public runTask(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.executeTask({ data, resolve, reject });
    });
  }

  /**
   * Get the total number of serverUtils in the pool
   */
  public getPoolSize(): number {
    return this.poolSize;
  }

  /**
   * Get the number of currently active (busy) serverUtils
   */
  public getActiveWorkers(): number {
    return this.poolSize - this.freeWorkers.length;
  }

  /**
   * Clean shutdown of all serverUtils
   * Call this when your application is shutting down
   */
  public async terminate(): Promise<void> {
    const terminationPromises = this.workers.map(worker => worker.terminate());
    await Promise.all(terminationPromises);
    console.log('Worker pool terminated');
  }
}