import React from 'react'
import { Text } from 'react-native'
import { act, render } from '@testing-library/react-native'

import { BottomBarProvider, useBottomBarHeight, useReportBottomBar } from '../BottomBarContext'

const Height = () => <Text testID='height'>{String(useBottomBarHeight())}</Text>
const Bar = ({ id, height }: { id: string, height: number }) => {
  useReportBottomBar(id, height)
  return null
}

describe('BottomBarContext', () => {
  it('is 0 with no bar on screen, and without a provider', () => {
    expect(render(<Height />).getByTestId('height').props.children).toBe('0')
    expect(render(<BottomBarProvider><Height /></BottomBarProvider>).getByTestId('height').props.children).toBe('0')
    // A report with no provider goes nowhere.
    expect(() => render(<Bar id='tabs' height={90} />)).not.toThrow()
  })

  it('is the height of the bar on screen, and 0 again when it leaves', () => {
    const screen = render(<BottomBarProvider><Height /><Bar id='tabs' height={94} /></BottomBarProvider>)
    expect(screen.getByTestId('height').props.children).toBe('94')
    screen.rerender(<BottomBarProvider><Height /></BottomBarProvider>)
    expect(screen.getByTestId('height').props.children).toBe('0')
  })

  it('is the tallest of the bars on screen, and follows a bar that changes its height', () => {
    const screen = render(
      <BottomBarProvider><Height /><Bar id='tabs' height={94} /><Bar id='actions' height={120} /></BottomBarProvider>
    )
    expect(screen.getByTestId('height').props.children).toBe('120')
    screen.rerender(<BottomBarProvider><Height /><Bar id='tabs' height={94} /><Bar id='actions' height={60} /></BottomBarProvider>)
    expect(screen.getByTestId('height').props.children).toBe('94')
    act(() => {
      screen.rerender(<BottomBarProvider><Height /><Bar id='tabs' height={0} /><Bar id='actions' height={60} /></BottomBarProvider>)
    })
    expect(screen.getByTestId('height').props.children).toBe('60')
  })
})
