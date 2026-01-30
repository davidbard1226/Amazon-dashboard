export interface PricePoint {
  date: string
  price: number
  raw: string
  seller: string
}

export interface Product {
  title: string
  sku: string
  myPrice: number
  stock: number
  points: PricePoint[]
  last?: PricePoint
}

export interface ProductMap {
  [asin: string]: Product
}
