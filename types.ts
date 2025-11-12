export enum Operation {
  Add = 'add',
  Subtract = 'subtract',
  Multiply = 'multiply',
}

export interface Step {
  title: string;
  description: string;
  calculation?: string;
}
