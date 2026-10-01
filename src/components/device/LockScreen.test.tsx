import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { portfolio } from '../../content/portfolio';
import { LockScreen } from './LockScreen';

describe('LockScreen', () => {
  it('shows the current time and the name while the device is shut', () => {
    const { container } = render(<LockScreen on/>);
    expect(container.querySelector('.lock-screen')).toHaveAttribute('data-on', 'true');
    expect(container.querySelector('time')!.textContent).toMatch(/\d{1,2}[:.]\d{2}/);
    expect(screen.getByText(portfolio.statusName)).toBeInTheDocument();
  });

  it('is marked off once the home screen has taken over', () => {
    const { container } = render(<LockScreen on={false}/>);
    expect(container.querySelector('.lock-screen')).toHaveAttribute('data-on', 'false');
  });
});
