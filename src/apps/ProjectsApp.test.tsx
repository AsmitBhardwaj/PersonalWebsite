import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PLATTER_APP_STORE_STATUS, platterProjectStatus } from '../boot/bootConfig';
import { createInputBus } from '../input/inputBus';
import { ProjectsApp } from './ProjectsApp';

describe('ProjectsApp', () => {
  it('shows the Platter status from PLATTER_APP_STORE_STATUS, linking the App Store only when live', () => {
    render(<ProjectsApp input={createInputBus().input}/>);
    const { text, href } = platterProjectStatus(PLATTER_APP_STORE_STATUS);
    if (href) {
      const link = screen.getByRole('link', { name: text });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
    } else {
      expect(screen.getByText(text, { exact: false })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: text })).toBeNull();
    }
  });
});
