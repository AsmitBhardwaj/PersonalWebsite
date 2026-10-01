export const HOME_GRID_COLUMNS = 4;

/** Next highlighted index when moving over a row-major grid of `count` items. Edges clamp; a short last row is entered at its last item. */
export function navigateGrid(index: number | null, direction: string, count: number, columns = HOME_GRID_COLUMNS): number {
  if (index === null || count <= 0) return 0;
  const row = Math.floor(index / columns);
  const column = index % columns;
  const lastRow = Math.floor((count - 1) / columns);
  switch (direction) {
    case 'left': return column === 0 ? index : index - 1;
    case 'right': return column === columns - 1 || index + 1 >= count ? index : index + 1;
    case 'down': return row >= lastRow ? index : Math.min(index + columns, count - 1);
    case 'up': return row === 0 ? index : index - columns;
    default: return index;
  }
}
