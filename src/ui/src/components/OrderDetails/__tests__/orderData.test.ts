jest.mock('@components', () => ({ useConfig: jest.fn(), useLanguage: jest.fn(), useUtils: jest.fn() }))

import { orderCommentText } from '../orderData'

describe('orderCommentText: the order\'s comment as every view writes it', () => {
  it('drops the blank lines and spaces it begins and ends with, and keeps the ones inside', () => {
    expect(orderCommentText({ comment: '\n\n  Ring twice.\n\nLeave it at the door.\n\n' })).toBe('Ring twice.\n\nLeave it at the door.')
    expect(orderCommentText({ comment: 'No onions.\r\n' })).toBe('No onions.')
  })

  it('is empty for a comment of only blanks, none, or a value that is not a text', () => {
    expect(orderCommentText({ comment: ' \n\n \t' })).toBe('')
    expect(orderCommentText({})).toBe('')
    expect(orderCommentText(null)).toBe('')
    expect(orderCommentText({ comment: 5 })).toBe('')
  })
})
