import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { StatusToast } from '../StatusToast';

describe('StatusToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders when visible is true', () => {
    render(
      <StatusToast
        message="Test message"
        status="success"
        visible={true}
      />
    );
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('does not render when visible is false', () => {
    render(
      <StatusToast
        message="Test message"
        status="success"
        visible={false}
      />
    );
    
    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });

  it('displays success styling', () => {
    render(
      <StatusToast
        message="Success!"
        status="success"
        visible={true}
      />
    );
    
    const toast = screen.getByRole('status');
    expect(toast).toHaveClass('text-success');
  });

  it('displays error styling', () => {
    render(
      <StatusToast
        message="Error!"
        status="error"
        visible={true}
      />
    );
    
    const toast = screen.getByRole('status');
    expect(toast).toHaveClass('text-danger');
  });

  it('calls onDismiss after autoDismissMs', () => {
    const handleDismiss = vi.fn();
    
    render(
      <StatusToast
        message="Auto dismiss"
        status="info"
        visible={true}
        onDismiss={handleDismiss}
        autoDismissMs={1000}
      />
    );
    
    expect(handleDismiss).not.toHaveBeenCalled();
    
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not auto-dismiss when autoDismissMs is 0', () => {
    const handleDismiss = vi.fn();
    
    render(
      <StatusToast
        message="No auto dismiss"
        status="info"
        visible={true}
        onDismiss={handleDismiss}
        autoDismissMs={0}
      />
    );
    
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    expect(handleDismiss).not.toHaveBeenCalled();
  });
});
