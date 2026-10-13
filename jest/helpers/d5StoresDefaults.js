/**
 * Controller defaults for stores UI wired exports (driver app).
 */
/* eslint-env jest */

const sampleBusiness = {
  id: 1,
  name: 'Store A',
  slug: 'store-a',
  address: '123 Main St',
  zipcode: '10001',
  logo: 'https://example.com/logo.png',
  enabled: true,
  open: true,
  location: { lat: 40.7128, lng: -74.006 }
}

const sampleCategory = {
  id: 10,
  name: 'Burgers',
  enabled: true,
  parent_category_id: null,
  subcategories: []
}

const sampleCategoryWithSubs = {
  id: 11,
  name: 'Drinks',
  enabled: true,
  parent_category_id: null,
  subcategories: [
    { id: 12, name: 'Soda', enabled: true, parent_category_id: 11, subcategories: [] }
  ]
}

const sampleProduct = {
  id: 100,
  name: 'Cheeseburger',
  enabled: true,
  category_id: 10,
  images: 'https://example.com/burger.png'
}

const storesListDefaults = {
  navigation: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true)
  },
  businessesList: {
    businesses: [sampleBusiness],
    loading: false,
    error: null
  },
  searchValue: '',
  getBusinesses: jest.fn(),
  handleChangeBusinessType: jest.fn(),
  handleBusinessClick: jest.fn(),
  paginationProps: { currentPage: 1, totalPages: 2, pageSize: 10, total: 15 },
  handleChangeSearch: jest.fn()
}

const businessControllerDefaults = {
  businessState: {
    loading: false,
    business: sampleBusiness,
    error: null
  },
  updateBusiness: jest.fn(),
  isUpdateStore: false,
  setIsUpdateStore: jest.fn(),
  navigation: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true)
  },
  handleCustomClick: jest.fn(),
  orderType: 1,
  isBusinessOpen: true
}

const businessProductListDefaults = {
  navigation: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true)
  },
  businessState: {
    loading: false,
    error: null,
    business: { id: 1, name: 'Store A', slug: 'store-a' }
  },
  productsList: {
    loading: false,
    products: [sampleProduct],
    error: null,
    pagination: { currentPage: 1, totalPages: 2 }
  },
  updateStoreCategory: jest.fn(),
  updateStoreProduct: jest.fn(),
  productSearch: '',
  categorySearch: '',
  handleChangeCategory: jest.fn(),
  handleChangeProductSearch: jest.fn(),
  handleChangeCategorySearch: jest.fn(),
  getCategoryProducts: jest.fn(),
  categories: [sampleCategory, sampleCategoryWithSubs],
  categoriesState: { loading: false }
}

const phoneInputNumberDefaults = {
  data: { error: '', phone: { country_phone_code: null, cellphone: null } },
  handleData: jest.fn(),
  defaultValue: '',
  defaultCode: 1,
  forwardRef: null,
  textInputProps: {},
  flagProps: {},
  onSubmitEditing: jest.fn()
}

const phoneInputNumberWithErrorDefaults = {
  ...phoneInputNumberDefaults,
  data: {
    error: 'The Phone Number field is invalid',
    phone: { country_phone_code: null, cellphone: null }
  }
}

module.exports = {
  sampleBusiness,
  sampleCategory,
  sampleCategoryWithSubs,
  sampleProduct,
  storesListDefaults,
  businessControllerDefaults,
  businessProductListDefaults,
  phoneInputNumberDefaults,
  phoneInputNumberWithErrorDefaults
}
