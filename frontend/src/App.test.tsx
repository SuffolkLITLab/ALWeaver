import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders header and active file label', () => {
    render(<App />);
    expect(screen.getByText(/Active File/i)).toBeInTheDocument();
  });
});
