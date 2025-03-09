export interface InstructionDoc {
  category: string;
  description: string;
  gas: string;
  fift: string;
  fift_examples?: string[];
  opcode: string;
  stack: string;
}

export interface InstructionBytecode {
  tlb: string;
  prefix: string;
  operands: any[];
}

export interface ValueFlowItem {
  stack: any[];
  registers: any[];
}

export interface ValueFlow {
  inputs: ValueFlowItem;
  outputs: ValueFlowItem;
}

export interface ControlFlow {
  branches: any[];
  nobranch?: boolean;
}

export interface Instruction {
  mnemonic: string;
  since_version: number;
  doc: InstructionDoc;
  bytecode: InstructionBytecode;
  value_flow: ValueFlow;
  control_flow: ControlFlow;
}

export interface InstructionsData {
  $schema: string;
  instructions: Instruction[];
} 