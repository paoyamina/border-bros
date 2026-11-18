import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('muestra inicio BOSSE en lugar del ejemplo predeterminado de React', () => {
  render(<App/>);
  expect(screen.getByText('Business Operating Platform')).toBeInTheDocument();
  expect(screen.getByAltText('Border Brothers')).toBeInTheDocument();
});
