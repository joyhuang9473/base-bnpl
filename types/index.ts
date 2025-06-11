import { type Address, type Hash, type TransactionReceipt } from 'viem'

// Core Protocol Types
export interface LoanApplication {
  borrower: Address
  amount: bigint
  collateralAmount: bigint
  collateralToken: Address
  requestedTerms: PaymentTerms
  creditScore: number
  timestamp: bigint
}

export interface Loan {
  id: bigint
  borrower: Address
  lender: Address
  amount: bigint
  collateralAmount: bigint
  collateralToken: Address
  terms: PaymentTerms
  status: LoanStatus
  creditScore: number
  createdAt: bigint
  payments: Payment[]
}

export interface Payment {
  id: bigint
  loanId: bigint
  amount: bigint
  dueDate: bigint
  paidDate?: bigint
  status: PaymentStatus
  lateFee: bigint
}

export interface PaymentTerms {
  totalAmount: bigint
  installments: number
  intervalDays: number
  interestRate: number // basis points (0 = 0%, 100 = 1%)
  lateFeeRate: number // basis points
}

export enum LoanStatus {
  PENDING = 0,
  APPROVED = 1,
  ACTIVE = 2,
  COMPLETED = 3,
  DEFAULTED = 4,
  LIQUIDATED = 5
}

export enum PaymentStatus {
  PENDING = 0,
  PAID = 1,
  LATE = 2,
  MISSED = 3
}

// Risk Assessment Types
export interface RiskAssessment {
  creditScore: number
  riskTier: RiskTier
  maxLoanAmount: bigint
  recommendedTerms: PaymentTerms
  collateralRequired: bigint
  approvalStatus: ApprovalStatus
}

export enum RiskTier {
  LOW = 0,    // Score 750+
  MEDIUM = 1, // Score 600-749  
  HIGH = 2,   // Score 300-599
  DENIED = 3  // Score below 300
}

export enum ApprovalStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
  REQUIRES_REVIEW = 3
}

// Lending Pool Types
export interface LenderPosition {
  lender: Address
  amount: bigint
  timestamp: bigint
  yieldEarned: bigint
  riskTier: RiskTier
}

export interface PoolStats {
  totalLiquidity: bigint
  totalLoaned: bigint
  utilizationRate: number
  avgYield: number
  totalLenders: number
  totalBorrowers: number
  defaultRate: number
}

// User Types
export interface UserProfile {
  address: Address
  userType: UserType
  kycLevel: KYCLevel
  creditScore?: number
  joinedAt: bigint
  totalBorrowed?: bigint
  totalLent?: bigint
  successfulPayments?: number
  missedPayments?: number
}

export enum UserType {
  CONSUMER = 0,
  LENDER = 1,
  MERCHANT = 2,
  BOTH = 3
}

export enum KYCLevel {
  NONE = 0,
  BASIC = 1,    // Email + basic verification
  STANDARD = 2, // Government ID + address
  ENHANCED = 3  // Full verification + income
}

// Transaction Types
export interface TransactionMetadata {
  hash: Hash
  blockNumber: bigint
  timestamp: bigint
  gasUsed: bigint
  gasPrice: bigint
  status: 'success' | 'failed' | 'pending'
}

export interface LoanTransaction {
  type: 'CREATE_LOAN' | 'FUND_LOAN' | 'MAKE_PAYMENT' | 'LIQUIDATE'
  loanId: bigint
  amount: bigint
  from: Address
  to: Address
  metadata: TransactionMetadata
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// Frontend State Types
export interface AppState {
  user: UserProfile | null
  wallet: WalletState
  loans: LoanState
  lending: LendingState
  ui: UIState
}

export interface WalletState {
  isConnected: boolean
  address?: Address
  chainId?: number
  balance?: {
    eth: bigint
    usdc: bigint
  }
}

export interface LoanState {
  activeLoans: Loan[]
  pendingApplications: LoanApplication[]
  paymentHistory: Payment[]
  currentApplication?: LoanApplication
  isLoading: boolean
  error?: string
}

export interface LendingState {
  position?: LenderPosition
  poolStats: PoolStats
  availableBalance: bigint
  earnings: bigint
  isLoading: boolean
  error?: string
}

export interface UIState {
  currentStep: ApplicationStep
  isApplicationModalOpen: boolean
  isPaymentModalOpen: boolean
  isLendingModalOpen: boolean
  notifications: Notification[]
}

export enum ApplicationStep {
  CONNECT_WALLET = 0,
  KYC_VERIFICATION = 1,
  LOAN_DETAILS = 2,
  COLLATERAL_SETUP = 3,
  TERMS_REVIEW = 4,
  APPROVAL_PENDING = 5,
  APPROVED = 6,
  REJECTED = 7
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: number
  read: boolean
}

// Contract Interface Types
export interface LendingPoolContract {
  address: Address
  abi: readonly unknown[]
}

export interface RiskEngineContract {
  address: Address
  abi: readonly unknown[]
}

export interface PaymentControllerContract {
  address: Address
  abi: readonly unknown[]
}

export interface CollateralManagerContract {
  address: Address
  abi: readonly unknown[]
}

// Hook Return Types
export interface UseLoanApplicationReturn {
  application: LoanApplication | null
  isLoading: boolean
  error: string | null
  submitApplication: (application: Omit<LoanApplication, 'borrower' | 'timestamp'>) => Promise<void>
  resetApplication: () => void
}

export interface UseLendingPoolReturn {
  poolStats: PoolStats
  userPosition: LenderPosition | null
  isLoading: boolean
  error: string | null
  deposit: (amount: bigint) => Promise<Hash>
  withdraw: (amount: bigint) => Promise<Hash>
  claimYield: () => Promise<Hash>
}

export interface UseRiskAssessmentReturn {
  assessment: RiskAssessment | null
  isLoading: boolean
  error: string | null
  assessRisk: (borrower: Address, amount: bigint, collateral: bigint) => Promise<void>
}

export interface UsePaymentReturn {
  payments: Payment[]
  upcomingPayment: Payment | null
  isLoading: boolean
  error: string | null
  makePayment: (paymentId: bigint) => Promise<Hash>
  setupAutoPay: (loanId: bigint) => Promise<Hash>
}

// Configuration Types
export interface AppConfig {
  contracts: {
    lendingPool: Address
    riskEngine: Address
    paymentController: Address
    collateralManager: Address
  }
  tokens: {
    usdc: Address
    weth: Address
  }
  chainId: number
  rpcUrl: string
  blockExplorer: string
}

export interface PaymentTermsConfig {
  standard: PaymentTerms
  extended: PaymentTerms[]
  maxAmount: bigint
  minCollateralRatio: number
}

// Merchant Integration Types
export interface MerchantConfig {
  merchantId: string
  name: string
  website: string
  logo?: string
  allowedTerms: PaymentTerms[]
  maxOrderValue: bigint
  minOrderValue: bigint
  callbackUrl?: string
}

export interface PurchaseRequest {
  merchantId: string
  orderId: string
  amount: bigint
  currency: 'USDC' | 'ETH'
  customerAddress: Address
  items: PurchaseItem[]
  metadata?: Record<string, unknown>
}

export interface PurchaseItem {
  id: string
  name: string
  price: bigint
  quantity: number
  category?: string
}

export interface CheckoutSession {
  id: string
  merchantId: string
  orderId: string
  amount: bigint
  status: CheckoutStatus
  loanId?: bigint
  expiresAt: bigint
  createdAt: bigint
}

export enum CheckoutStatus {
  PENDING = 0,
  APPROVED = 1,
  COMPLETED = 2,
  EXPIRED = 3,
  FAILED = 4
}

// Analytics Types
export interface ProtocolAnalytics {
  totalVolumeUSD: number
  totalLoans: number
  totalLenders: number
  totalBorrowers: number
  averageAPY: number
  defaultRate: number
  liquidationRate: number
  monthlyGrowth: number
}

export interface LoanAnalytics {
  dailyVolume: { date: string; volume: number }[]
  riskDistribution: { tier: RiskTier; count: number; percentage: number }[]
  repaymentStatus: { status: PaymentStatus; count: number; percentage: number }[]
  avgLoanSize: number
  avgRepaymentPeriod: number
}

export interface LenderAnalytics {
  yieldByTier: { tier: RiskTier; apy: number; volume: number }[]
  depositsOverTime: { date: string; amount: number }[]
  topLenders: { address: Address; amount: number; yield: number }[]
  poolUtilization: number
  avgYield: number
}

// Error Types
export interface ContractError {
  name: string
  message: string
  code?: string
  data?: unknown
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface APIError {
  status: number
  message: string
  details?: string
  timestamp: number
}

// Event Types (for contract events)
export interface LoanCreatedEvent {
  loanId: bigint
  borrower: Address
  amount: bigint
  collateralAmount: bigint
  terms: PaymentTerms
  blockNumber: bigint
  transactionHash: Hash
}

export interface PaymentMadeEvent {
  loanId: bigint
  paymentId: bigint
  borrower: Address
  amount: bigint
  paymentDate: bigint
  blockNumber: bigint
  transactionHash: Hash
}

export interface LiquidationEvent {
  loanId: bigint
  borrower: Address
  collateralLiquidated: bigint
  recoveredAmount: bigint
  blockNumber: bigint
  transactionHash: Hash
}

export interface DepositEvent {
  lender: Address
  amount: bigint
  newBalance: bigint
  blockNumber: bigint
  transactionHash: Hash
}

// Utility Types
export type NonNullable<T> = T extends null | undefined ? never : T
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>

// Constants Types
export interface RiskParameters {
  minCreditScore: number
  maxLoanToCollateral: number
  liquidationThreshold: number
  gracePeriodDays: number
  maxLatePayments: number
}

export interface YieldParameters {
  baseTierAPY: readonly [number, number, number] // [low, medium, high]
  utilizationMultiplier: number
  maxYieldBonus: number
  reserveRatio: number
}

// Form Types
export interface LoanApplicationForm {
  amount: string
  purpose: string
  collateralType: 'ETH' | 'USDC'
  collateralAmount: string
  preferredTerms: 'standard' | 'extended'
  installments?: number
  agreedToTerms: boolean
}

export interface KYCForm {
  email: string
  firstName: string
  lastName: string
  dateOfBirth: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  phoneNumber: string
  governmentId?: File
  proofOfAddress?: File
}

export interface LenderOnboardingForm {
  investmentAmount: string
  riskTolerance: 'low' | 'medium' | 'high' | 'mixed'
  investmentHorizon: 'short' | 'medium' | 'long'
  autoReinvest: boolean
  agreedToTerms: boolean
}

// Component Props Types
export interface BaseProps {
  className?: string
  children?: React.ReactNode
}

export interface WalletConnectProps extends BaseProps {
  onConnect?: (address: Address) => void
  onDisconnect?: () => void
}

export interface LoanCardProps extends BaseProps {
  loan: Loan
  onPayment?: (paymentId: bigint) => void
  onViewDetails?: (loanId: bigint) => void
}

export interface PaymentScheduleProps extends BaseProps {
  payments: Payment[]
  onMakePayment?: (paymentId: bigint) => void
}

export interface RiskIndicatorProps extends BaseProps {
  score: number
  tier: RiskTier
  size?: 'sm' | 'md' | 'lg'
}

export interface YieldDisplayProps extends BaseProps {
  apy: number
  amount: bigint
  period: 'daily' | 'monthly' | 'yearly'
}

// Navigation Types
export interface NavigationItem {
  href: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: string | number
  children?: NavigationItem[]
}

export interface BreadcrumbItem {
  href?: string
  label: string
  current?: boolean
}

// Theme Types
export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  foreground: string
  muted: string
  destructive: string
  border: string
  input: string
  ring: string
}

export interface ThemeConfig {
  colors: ThemeColors
  fonts: {
    sans: string[]
    mono: string[]
  }
  spacing: Record<string, string>
  borderRadius: Record<string, string>
}