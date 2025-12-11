import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleButton } from '../ToggleButton';

describe('ToggleButton', () => {
  const options: [{ value: 'a'; label: string }, { value: 'b'; label: string }] = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ];

  it('renders both options', () => {
    render(
      <ToggleButton
        options={options}
        value="a"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('highlights the active option', () => {
    render(
      <ToggleButton
        options={options}
        value="a"
        onChange={() => {}}
      />
    );
    
    const optionA = screen.getByText('Option A').closest('button');
    const optionB = screen.getByText('Option B').closest('button');
    
    expect(optionA).toHaveAttribute('aria-pressed', 'true');
    expect(optionB).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange when clicking an option', () => {
    const handleChange = vi.fn();
    
    render(
      <ToggleButton
        options={options}
        value="a"
        onChange={handleChange}
      />
    );
    
    fireEvent.click(screen.getByText('Option B'));
    
    expect(handleChange).toHaveBeenCalledWith('b');
  });

  it('renders icons when provided', () => {
    const optionsWithIcons: [{ value: 'a'; label: string; icon: JSX.Element }, { value: 'b'; label: string; icon: JSX.Element }] = [
      { value: 'a', label: 'Option A', icon: <span data-testid="icon-a">A</span> },
      { value: 'b', label: 'Option B', icon: <span data-testid="icon-b">B</span> },
    ];
    
    render(
      <ToggleButton
        options={optionsWithIcons}
        value="a"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByTestId('icon-a')).toBeInTheDocument();
    expect(screen.getByTestId('icon-b')).toBeInTheDocument();
  });
});
