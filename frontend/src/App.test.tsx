import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders header with file label', () => {
    render(<App />);
    expect(screen.getByText(/File:/i)).toBeInTheDocument();
  });
});
