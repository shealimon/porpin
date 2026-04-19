import { formatCurrency } from '../utils/format'

type PriceCardProps = {
  wordCount: number
  amountCents: number
  currency: string
}

export function PriceCard({ wordCount, amountCents, currency }: PriceCardProps) {
  return (
    <section className="price-card" aria-labelledby="price-card-heading">
      <h2 id="price-card-heading" className="price-card__title">
        Estimate
      </h2>
      <dl className="price-card__rows">
        <div className="price-card__row">
          <dt>Words</dt>
          <dd>{wordCount.toLocaleString()}</dd>
        </div>
        <div className="price-card__row price-card__row--total">
          <dt>Total</dt>
          <dd>{formatCurrency(amountCents, currency)}</dd>
        </div>
      </dl>
    </section>
  )
}
