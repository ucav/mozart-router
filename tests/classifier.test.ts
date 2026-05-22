import { describe, it, expect } from 'vitest';
import { TaskClassifier } from '../src/routing/classifier';

describe('TaskClassifier', () => {
  const classifier = new TaskClassifier();

  it('classifies debugging tasks', () => {
    const result = classifier.classify('debug my Next.js build error');
    expect(result.taskType).toBe('debugging');
    expect(result.complexity).toBe('high');
    expect(result.contextNeed).toBe('very_high');
    expect(result.requiresCodeStrength).toBe(true);
  });

  it('classifies test writing tasks', () => {
    const result = classifier.classify('write Playwright tests for the login page');
    expect(result.taskType).toBe('test_writing');
    expect(result.requiresTools).toBe(true);
  });

  it('classifies refactoring tasks', () => {
    const result = classifier.classify('refactor the authentication module');
    expect(result.taskType).toBe('refactor');
    expect(result.complexity).toBe('high');
  });

  it('classifies code generation tasks', () => {
    const result = classifier.classify('build a REST API endpoint for user management');
    expect(result.taskType).toBe('code_generation');
    expect(result.requiresCodeStrength).toBe(true);
  });

  it('classifies security audit tasks', () => {
    const result = classifier.classify('security audit of the payment module');
    expect(result.taskType).toBe('security_audit');
    expect(result.complexity).toBe('critical');
    expect(result.privacyNeed).toBe('high');
  });

  it('classifies summary tasks', () => {
    const result = classifier.classify('summarize this meeting transcript');
    expect(result.taskType).toBe('summarize');
    expect(result.complexity).toBe('low');
  });

  it('classifies planning tasks', () => {
    const result = classifier.classify('plan the architecture for our new microservice');
    expect(result.taskType).toBe('architecture');
  });

  it('classifies chat as default', () => {
    const result = classifier.classify('hello, how are you?');
    expect(result.taskType).toBe('chat');
    expect(result.complexity).toBe('low');
  });

  it('uses taskHint to improve classification', () => {
    const result = classifier.classify('find the bug', 'debugging');
    expect(result.taskType).toBe('debugging');
  });

  it('detects long context need from input length', () => {
    const longInput = 'x'.repeat(60000);
    const result = classifier.classify(longInput);
    expect(result.requiresLongContext).toBe(true);
  });
});
