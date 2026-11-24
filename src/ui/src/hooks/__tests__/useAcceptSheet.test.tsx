import '../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { act, render } from '@testing-library/react-native'

// The accept view is a stand-in that hands its props over: what the host gives it and does with its answers is what is tested.
let mockViewProps: any = null
jest.mock('@ui', () => ({
  AcceptOrRejectOrder: (props: any) => {
    mockViewProps = props
    return null
  }
}))

import { useAcceptSheet } from '../useAcceptSheet'
import { DRIVER_ACTIONS, DRIVER_APP_TITLE, DRIVER_ORDER_TITLES } from '../../components/AcceptOrRejectOrder/driverActions'

let host: any
const Host = (props: any) => {
  host = useAcceptSheet(props)
  return <>{host.sheet}</>
}

const target = (extra: any = {}) => ({
  action: 'accept',
  ids: [7, 8],
  order: { id: 7, customer: { cellphone: '5551111', country_phone_code: '1' } },
  handleChangeOrderStatus: jest.fn().mockResolvedValue([{}, {}]),
  ...extra
})

describe('useAcceptSheet', () => {
  beforeEach(() => {
    mockViewProps = null
  })

  it('draws nothing until a screen asks for the sheet', () => {
    render(<Host />)
    expect(mockViewProps).toBeNull()
  })

  it('gives the accept view the driver app\'s actions, titles and app unless the screen has its own', () => {
    render(<Host />)
    act(() => host.openSheet(target()))
    expect(mockViewProps.actions).toBe(DRIVER_ACTIONS)
    expect(mockViewProps.orderTitle).toBe(DRIVER_ORDER_TITLES)
    expect(mockViewProps.appTitle).toBe(DRIVER_APP_TITLE)
    expect(mockViewProps.orderId).toBe(7)
    expect(mockViewProps.customerCellphone).toBe('5551111')
    expect(mockViewProps.customerCountryPhoneCode).toBe('1')
    expect(mockViewProps.action).toBe('accept')
  })

  it('tells the view when the sheet changes no status (the delivery time of a request), and not otherwise', () => {
    render(<Host />)
    act(() => host.openSheet(target({ skipsStatusImage: true })))
    expect(mockViewProps.skipsStatusImage).toBe(true)
    act(() => host.openSheet(target()))
    expect(mockViewProps.skipsStatusImage).toBeUndefined()
  })

  it('takes the screen\'s own maps and its loading state', () => {
    const own = { accept: 'acceptByDriver' }
    render(<Host actions={own} isLoadingOrder />)
    act(() => host.openSheet(target()))
    expect(mockViewProps.actions).toBe(own)
    expect(mockViewProps.isLoadingOrder).toBe(true)
  })

  it('sends the status change with the target\'s own request, closes on success and tells the screen once', async () => {
    const onClosed = jest.fn()
    const next = target({ onClosed })
    render(<Host />)
    act(() => host.openSheet(next))
    let answer: any
    await act(async () => { answer = await mockViewProps.handleUpdateOrder(8, { status: 8 }, undefined) })
    expect(answer).toBe(true)
    expect(next.handleChangeOrderStatus).toHaveBeenCalledTimes(1)
    expect(next.handleChangeOrderStatus).toHaveBeenCalledWith(8, [7, 8], { status: 8 }, { withDetails: true })
    expect(host.sheet).toBeNull()
    // The offline path closes the sheet again after its own answer: the screen is told only once.
    act(() => host.closeSheet())
    expect(onClosed).toHaveBeenCalledTimes(1)
  })

  it('stays open when the request did not change every order, says why in the view\'s own error and answers false', async () => {
    const onClosed = jest.fn()
    const next = target({ onClosed, handleChangeOrderStatus: jest.fn().mockResolvedValue([{ id: 7, result: {}, error: false }, { id: 8, result: ['Order not found'], error: true }]) })
    render(<Host />)
    act(() => host.openSheet(next))
    let answer: any
    await act(async () => { answer = await mockViewProps.handleUpdateOrder(8, { status: 8 }, undefined) })
    expect(answer).toBe(false)
    expect(host.sheet).not.toBeNull()
    expect(onClosed).not.toHaveBeenCalled()
    expect(mockViewProps.orderError).toBe('Orders that did not change: 1 · Order not found')
  })

  it('a failed delivery time (a null for each order) keeps the sheet with a sentence and a second tap sends it again', async () => {
    const request = jest.fn().mockResolvedValueOnce([null, null]).mockResolvedValueOnce([{}, {}])
    const onClosed = jest.fn()
    render(<Host />)
    act(() => host.openSheet(target({ onClosed, handleChangeOrderStatus: request })))
    await act(async () => { expect(await mockViewProps.handleUpdateOrder(8, { delivered_in: 20 }, undefined)).toBe(false) })
    expect(host.sheet).not.toBeNull()
    expect(mockViewProps.orderError).toBe('The change was not saved. Try again.')
    await act(async () => { expect(await mockViewProps.handleUpdateOrder(8, { delivered_in: 20 }, undefined)).toBe(true) })
    expect(request).toHaveBeenCalledTimes(2)
    expect(host.sheet).toBeNull()
    expect(onClosed).toHaveBeenCalledTimes(1)
  })

  it('a request that throws keeps the sheet open (the view is not left waiting)', async () => {
    render(<Host />)
    act(() => host.openSheet(target({ handleChangeOrderStatus: jest.fn().mockRejectedValue(new Error('Network request failed')) })))
    let answer: any
    await act(async () => { answer = await mockViewProps.handleUpdateOrder(8, {}, undefined) })
    expect(answer).toBe(false)
    expect(host.sheet).not.toBeNull()
    expect(mockViewProps.orderError).toBe('Network request failed')
  })

  it('the retry of a group sends only the orders that did not change', async () => {
    const request = jest.fn()
      .mockResolvedValueOnce([{ id: 7, result: {}, error: false }, { id: 8, result: ['Closed'], error: true }])
      .mockResolvedValueOnce([{ id: 8, result: {}, error: false }])
    render(<Host />)
    act(() => host.openSheet(target({ handleChangeOrderStatus: request })))
    await act(async () => { await mockViewProps.handleUpdateOrder(8, {}, undefined) })
    await act(async () => { await mockViewProps.handleUpdateOrder(8, {}, undefined) })
    expect(request.mock.calls[1][1]).toEqual([8])
    expect(host.sheet).toBeNull()
  })

  it('what the offline queue took closes the sheet by the view\'s own close, whatever the request answered', async () => {
    const onClosed = jest.fn()
    render(<Host />)
    // The view queues the change, calls the request (which fails offline) and closes itself.
    act(() => host.openSheet(target({ onClosed, handleChangeOrderStatus: jest.fn().mockResolvedValue(null) })))
    await act(async () => { await mockViewProps.handleUpdateOrder(8, { status: 8 }, { dataToSave: { status: 8, unsync: true } }) })
    act(() => mockViewProps.closeModal())
    expect(host.sheet).toBeNull()
    expect(onClosed).toHaveBeenCalledTimes(1)
  })

  it('a sheet that opens starts clean: the failure of the one before is not shown, nor its retry narrowed', async () => {
    const request = jest.fn().mockResolvedValueOnce([null, null]).mockResolvedValueOnce([{}, {}])
    render(<Host />)
    act(() => host.openSheet(target({ handleChangeOrderStatus: request })))
    await act(async () => { await mockViewProps.handleUpdateOrder(8, {}, undefined) })
    act(() => mockViewProps.closeModal())
    act(() => host.openSheet(target({ handleChangeOrderStatus: request })))
    expect(mockViewProps.orderError).toBeUndefined()
    await act(async () => { await mockViewProps.handleUpdateOrder(8, {}, undefined) })
    expect(request.mock.calls[1][1]).toEqual([7, 8])
  })

  describe('an answer that comes after the sheet it was asked in is gone', () => {
    /** A request that answers when the test says so. */
    const slow = () => {
      let answer!: (value: any) => void
      const request = jest.fn(() => new Promise((resolve) => { answer = resolve }))
      return { request, answer: (value: any) => answer(value) }
    }

    it('a success does not close, nor tell the screen of, the sheet that is open now', async () => {
      const first = slow()
      const firstClosed = jest.fn()
      const secondClosed = jest.fn()
      render(<Host />)
      act(() => host.openSheet(target({ onClosed: firstClosed, handleChangeOrderStatus: first.request })))
      let pending!: Promise<any>
      act(() => { pending = mockViewProps.handleUpdateOrder(8, { status: 8 }, undefined) })
      // The driver dismisses the sheet while its request runs and opens the sheet of another group.
      act(() => mockViewProps.closeModal(false))
      expect(firstClosed).toHaveBeenCalledTimes(1)
      act(() => host.openSheet(target({ ids: [20, 21], onClosed: secondClosed })))
      await act(async () => { first.answer([{}, {}]); await pending })
      expect(host.sheet).not.toBeNull()
      expect(mockViewProps.orderId).toBe(20)
      expect(secondClosed).not.toHaveBeenCalled()
      expect(firstClosed).toHaveBeenCalledTimes(1)
    })

    it('a failure does not put its error on the sheet that is open now, nor narrow that sheet\'s retry to its ids', async () => {
      const first = slow()
      const second = jest.fn().mockResolvedValue([{}, {}])
      render(<Host />)
      act(() => host.openSheet(target({ handleChangeOrderStatus: first.request })))
      let pending!: Promise<any>
      act(() => { pending = mockViewProps.handleUpdateOrder(8, { status: 8 }, undefined) })
      act(() => mockViewProps.closeModal(false))
      act(() => host.openSheet(target({ ids: [20, 21], handleChangeOrderStatus: second })))
      await act(async () => { first.answer([{ id: 7, result: ['Closed'], error: true }, { id: 8, result: {}, error: false }]); await pending })
      expect(mockViewProps.orderError).toBeUndefined()
      await act(async () => { await mockViewProps.handleUpdateOrder(8, { status: 8 }, undefined) })
      // Every order of this sheet, not the one the first sheet had left.
      expect(second.mock.calls[0][1]).toEqual([20, 21])
      expect(host.sheet).toBeNull()
    })

    it('says nothing to the view that asked: its answer is of no one', async () => {
      const first = slow()
      render(<Host />)
      act(() => host.openSheet(target({ handleChangeOrderStatus: first.request })))
      let pending!: Promise<any>
      act(() => { pending = mockViewProps.handleUpdateOrder(8, { status: 8 }, undefined) })
      act(() => mockViewProps.closeModal(false))
      let answer: any = 'unset'
      await act(async () => { first.answer([{}, {}]); answer = await pending })
      expect(answer).toBeUndefined()
    })

    it('still closes the sheet it was asked in when nothing replaced it', async () => {
      const first = slow()
      const onClosed = jest.fn()
      render(<Host />)
      act(() => host.openSheet(target({ onClosed, handleChangeOrderStatus: first.request })))
      let pending!: Promise<any>
      act(() => { pending = mockViewProps.handleUpdateOrder(8, { status: 8 }, undefined) })
      await act(async () => { first.answer([{}, {}]); await pending })
      expect(host.sheet).toBeNull()
      expect(onClosed).toHaveBeenCalledTimes(1)
    })
  })

  it('closes when the view is dismissed', () => {
    const onClosed = jest.fn()
    render(<Host />)
    act(() => host.openSheet(target({ onClosed })))
    act(() => mockViewProps.closeModal(false))
    expect(host.sheet).toBeNull()
    expect(onClosed).toHaveBeenCalledTimes(1)
  })
})
