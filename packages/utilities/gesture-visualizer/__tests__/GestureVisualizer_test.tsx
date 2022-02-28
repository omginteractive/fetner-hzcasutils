/* eslint-env jest, browser */
import React from 'react';
import {render} from '@testing-library/react';
import GestureVisualizer, {useGestureVisualizer} from '..';

test('GestureVisualizer renders something', () => {
  const GestureVisualizerUser = (): JSX.Element => {
    const [, {data}] = useGestureVisualizer('test');
    return <GestureVisualizer data={data} />;
  };
  const {container} = render(<GestureVisualizerUser />);
  expect(container).toBeInTheDocument();
});
