import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PhoneScreen } from './PhoneScreen';

describe('PhoneScreen', () => {
  it('opens an app and returns home with Escape', () => {
    render(<PhoneScreen ready booting={false}/>);
    fireEvent.click(screen.getAllByRole('button', { name: /^open projects$/i }).find((button) => button.classList.contains('app-icon'))!);
    expect(screen.getByText('Platter')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getAllByRole('button', { name: /^open projects$/i }).some((button) => button.classList.contains('app-icon'))).toBe(true);
  });

  it('opens a note inside the phone', () => {
    render(<PhoneScreen ready booting={false}/>);
    fireEvent.click(screen.getByRole('button', { name: /^open notes$/i }));
    fireEvent.click(screen.getByRole('button', { name: /designing for delight/i }));
    expect(screen.getByText(/delight works best/i)).toBeInTheDocument();
  });

  it('keeps the placeholder now-playing widget hidden but music reachable by id', () => {
    render(<PhoneScreen ready booting={false}/>);
    expect(screen.queryByText(/placeholder track/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^open /i }).filter((button) => button.classList.contains('app-icon'))).toHaveLength(6);
  });
});
