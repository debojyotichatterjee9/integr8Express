import mongoose, { Schema, Document } from 'mongoose';

/**
 * Currency nested document interface
 */
export interface ICurrency {
  code: string;
  name: string;
  numericCode: string;
  symbol: string;
}

/**
 * CreditCard nested document interface
 */
export interface ICreditCard {
  number: string;
  cvv: string;
  issuer: string;
}

/**
 * CryptoAddress nested document interface
 */
export interface ICryptoAddress {
  bitcoin?: string;
  ethereum?: string;
  litecoin?: string;
}

/**
 * Finance Interface
 */
export interface IFinance extends Document {
  accountName: string;
  accountNumber: string;
  amount: number;
  bic: string;
  cryptoAddresses: ICryptoAddress;
  creditCard: ICreditCard;
  currency: ICurrency;
  iban: string;
  pin: string;
  routingNumber: string;
  transactionDescription: string;
  transactionType: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Currency Sub-schema
 */
const CurrencySchema = new Schema<ICurrency>(
  {
    code: { type: String, required: true, uppercase: true },
    name: { type: String, required: true },
    numericCode: { type: String, required: true },
    symbol: { type: String, required: true }
  },
  { _id: false }
);

/**
 * Credit Card Sub-schema
 */
const CreditCardSchema = new Schema<ICreditCard>(
  {
    number: { type: String, required: true },
    cvv: { type: String, required: true },
    issuer: { type: String, required: true }
  },
  { _id: false }
);

/**
 * Crypto Address Sub-schema
 */
const CryptoAddressSchema = new Schema<ICryptoAddress>(
  {
    bitcoin: { type: String },
    ethereum: { type: String },
    litecoin: { type: String }
  },
  { _id: false }
);

/**
 * Finance Schema
 */
const FinanceSchema = new Schema<IFinance>(
  {
    accountName: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
      index: true
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      trim: true,
      unique: true,
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
      index: true
    },
    bic: {
      type: String,
      required: [true, 'BIC is required'],
      trim: true,
      uppercase: true
    },
    cryptoAddresses: {
      type: CryptoAddressSchema,
      required: true
    },
    creditCard: {
      type: CreditCardSchema,
      required: true
    },
    currency: {
      type: CurrencySchema,
      required: true
    },
    iban: {
      type: String,
      required: [true, 'IBAN is required'],
      trim: true,
      unique: true,
      uppercase: true,
      index: true
    },
    pin: {
      type: String,
      required: [true, 'PIN is required']
    },
    routingNumber: {
      type: String,
      required: [true, 'Routing number is required'],
      trim: true
    },
    transactionDescription: {
      type: String,
      required: [true, 'Transaction description is required'],
      trim: true
    },
    transactionType: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: ['deposit', 'withdrawal', 'payment', 'invoice', 'transfer'],
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'finances'
  }
);

// Compound indexes
FinanceSchema.index({ accountNumber: 1, transactionType: 1 });
FinanceSchema.index({ 'currency.code': 1, amount: -1 });
FinanceSchema.index({ transactionType: 1, createdAt: -1 });

// Text index for search
FinanceSchema.index({ accountName: 'text', transactionDescription: 'text' });

// Export model
export const Finance = mongoose.model<IFinance>('Finance', FinanceSchema);
export default Finance;