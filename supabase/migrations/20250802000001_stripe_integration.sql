-- Stripe Integration Tables (2025 Best Practices)

-- Create customers table to bridge users and Stripe
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT UNIQUE
);

-- Create products table (synced from Stripe)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    active BOOLEAN,
    name TEXT,
    description TEXT,
    image TEXT,
    metadata JSONB,
    created TIMESTAMPTZ DEFAULT NOW(),
    updated TIMESTAMPTZ DEFAULT NOW()
);

-- Create prices table (synced from Stripe)
CREATE TABLE IF NOT EXISTS public.prices (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products(id),
    active BOOLEAN,
    description TEXT,
    unit_amount BIGINT,
    currency TEXT CHECK (char_length(currency) = 3),
    type TEXT CHECK (type IN ('one_time', 'recurring')),
    interval TEXT CHECK (interval IN ('day', 'week', 'month', 'year')),
    interval_count INTEGER,
    trial_period_days INTEGER,
    metadata JSONB,
    created TIMESTAMPTZ DEFAULT NOW(),
    updated TIMESTAMPTZ DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid')),
    metadata JSONB,
    price_id TEXT REFERENCES prices(id),
    quantity INTEGER,
    cancel_at_period_end BOOLEAN,
    created TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    current_period_start TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    current_period_end TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    cancel_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    canceled_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    trial_start TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    trial_end TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Customers policies
CREATE POLICY "Users can view own customer data" ON customers
    FOR SELECT USING (auth.uid() = id);

-- Products policies (public read)
CREATE POLICY "Products are viewable by everyone" ON products
    FOR SELECT USING (true);

-- Prices policies (public read)
CREATE POLICY "Prices are viewable by everyone" ON prices
    FOR SELECT USING (true);

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Function to handle user creation (updated for Stripe)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into users table
    INSERT INTO public.users (id, email, subscription_tier, subscription_status, trial_ends_at)
    VALUES (
        NEW.id,
        NEW.email,
        'free',
        'trial',
        NOW() + INTERVAL '14 days'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Insert into customers table
    INSERT INTO public.customers (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger if not exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to handle subscription updates
CREATE OR REPLACE FUNCTION public.update_user_subscription(
    user_id UUID,
    subscription_status TEXT,
    subscription_tier TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.users
    SET 
        subscription_status = update_user_subscription.subscription_status,
        subscription_tier = update_user_subscription.subscription_tier,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes for performance
CREATE INDEX idx_customers_stripe_customer_id ON customers(stripe_customer_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_prices_product_id ON prices(product_id);
CREATE INDEX idx_prices_active ON prices(active);

-- Update existing users to have customer records
INSERT INTO public.customers (id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT id FROM public.customers);