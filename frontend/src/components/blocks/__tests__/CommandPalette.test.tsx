import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '../CommandPalette';
import type { InterviewOrderNode } from '@/utils/interviewOrderAST';

describe('CommandPalette', () => {
  const mockOnClose = vi.fn();
  const mockOnInsert = vi.fn();
  
  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnInsert.mockClear();
  });
  
  it('renders when isOpen is true', () => {
    render(
      <CommandPalette 
        isOpen={true} 
        onClose={mockOnClose} 
        onInsert={mockOnInsert}
      />
    );
    
    expect(screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument();
  });
  
  it('does not render when isOpen is false', () => {
    render(
      <CommandPalette 
        isOpen={false} 
        onClose={mockOnClose} 
        onInsert={mockOnInsert}
      />
    );
    
    expect(screen.queryByPlaceholderText(/Type a command/i)).not.toBeInTheDocument();
  });
  
  it('shows default suggestions when input is empty', () => {
    render(
      <CommandPalette 
        isOpen={true} 
        onClose={mockOnClose} 
        onInsert={mockOnInsert}
      />
    );
    
    expect(screen.getByText('Ask variable')).toBeInTheDocument();
    expect(screen.getByText('Section')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Gather list')).toBeInTheDocument();
  });
  
  it('shows variable suggestions when typing "ask" (without space)', async () => {
    const user = userEvent.setup();
    
    render(
      <CommandPalette 
        isOpen={true} 
        onClose={mockOnClose} 
        onInsert={mockOnInsert}
        availableVariables={['user_name', 'user_email', 'address']}
      />
    );
    
    const input = screen.getByPlaceholderText(/Type a command/i);
    await user.type(input, 'ask');
    
    // Should show all variables when just "ask" is typed
    expect(screen.getByText('user_name')).toBeInTheDocument();
    expect(screen.getByText('user_email')).toBeInTheDocument();
    expect(screen.getByText('address')).toBeInTheDocument();
  });
  
  it('shows variable suggestions when typing "ask " (with space)', async () => {
    const user = userEvent.setup();
    
    render(
      <CommandPalette 
        isOpen={true} 
        onClose={mockOnClose} 
        onInsert={mockOnInsert}
        availableVariables={['user_name', 'user_email', 'address']}
      />
    );
    
    const input = screen.getByPlaceholderText(/Type a command/i);
    await user.type(input, 'ask ');
    
    expect(screen.getByText('user_name')).toBeInTheDocument();
    expect(screen.getByText('user_email')).toBeInTheDocument();
    expect(screen.getByText('address')).toBeInTheDocument();
  });
  
  it('filters variables by query', async () => {
    const user = userEvent.setup();
    
    render(
      <CommandPalette 
        isOpen={true} 
        onClose={mockOnClose} 
        onInsert={mockOnInsert}
        availableVariables={['user_name', 'user_email', 'address']}
      />
    );
    
    const input = screen.getByPlaceholderText(/Type a command/i);
    await user.type(input, 'ask user');
    
    expect(screen.getByText('user_name')).toBeInTheDocument();
    expect(screen.getByText('user_email')).toBeInTheDocument();
    expect(screen.queryByText('address')).not.toBeInTheDocument();
  });
  
  it('inserts ASK node when pressing Enter with selected variable', async () => {
    const user = userEvent.setup();
    
    render(
      <CommandPalette 
        isOpen={true} 
        onClose={mockOnClose} 
        onInsert={mockOnInsert}
        availableVariables={['user_name', 'user_email']}
      />
    );
    
    const input = screen.getByPlaceholderText(/Type a command/i);
    await user.type(input, 'ask ');
    
    // Press Enter to select the first variable
    await user.keyboard('{Enter}');
    
    expect(mockOnInsert).toHaveBeenCalledWith({ t: 'ASK', var: 'user_name' });
    expect(mockOnClose).toHaveBeenCalled();
  });
  
  it('navigates with arrow keys', async () => {
    const user = userEvent.setup();
    
    render(
      <CommandPalette 
        isOpen={true} 
        onClose={mockOnClose} 
        onInsert={mockOnInsert}
        availableVariables={['var_a', 'var_b', 'var_c']}
      />
    );
    
    const input = screen.getByPlaceholderText(/Type a command/i);
    await user.type(input, 'ask');
    
    // Navigate down twice and select
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    
    expect(mockOnInsert).toHaveBeenCalledWith({ t: 'ASK', var: 'var_c' });
  });
  
  it('closes on Escape', async () => {
    const user = userEvent.setup();
    
    render(
      <CommandPalette 
        isOpen={true} 
        onClose={mockOnClose} 
        onInsert={mockOnInsert}
      />
    );
    
    await user.keyboard('{Escape}');
    
    expect(mockOnClose).toHaveBeenCalled();
  });
  
  it('inserts section node correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <CommandPalette 
        isOpen={true} 
        onClose={mockOnClose} 
        onInsert={mockOnInsert}
      />
    );
    
    const input = screen.getByPlaceholderText(/Type a command/i);
    await user.type(input, 'section Introduction');
    await user.keyboard('{Enter}');
    
    expect(mockOnInsert).toHaveBeenCalledWith({ t: 'SECTION', name: 'Introduction' });
  });
  
  it('inserts progress node correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <CommandPalette 
        isOpen={true} 
        onClose={mockOnClose} 
        onInsert={mockOnInsert}
      />
    );
    
    const input = screen.getByPlaceholderText(/Type a command/i);
    await user.type(input, 'progress 75');
    await user.keyboard('{Enter}');
    
    expect(mockOnInsert).toHaveBeenCalledWith({ t: 'PROGRESS', value: 75 });
  });
  
  it('inserts gather node correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <CommandPalette 
        isOpen={true} 
        onClose={mockOnClose} 
        onInsert={mockOnInsert}
      />
    );
    
    const input = screen.getByPlaceholderText(/Type a command/i);
    await user.type(input, 'gather users');
    await user.keyboard('{Enter}');
    
    expect(mockOnInsert).toHaveBeenCalledWith({ t: 'GATHER', list: 'users' });
  });
  
  it('clicking a variable suggestion inserts it', async () => {
    const user = userEvent.setup();
    
    render(
      <CommandPalette 
        isOpen={true} 
        onClose={mockOnClose} 
        onInsert={mockOnInsert}
        availableVariables={['test_var']}
      />
    );
    
    const input = screen.getByPlaceholderText(/Type a command/i);
    await user.type(input, 'ask');
    
    // Wait a bit for justOpened flag to clear
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Click the variable
    const varButton = screen.getByText('test_var');
    await user.click(varButton);
    
    expect(mockOnInsert).toHaveBeenCalledWith({ t: 'ASK', var: 'test_var' });
  });
});
