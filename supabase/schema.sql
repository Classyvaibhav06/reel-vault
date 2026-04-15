-- Create the 'reels' table
CREATE TABLE reels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access (since this is a personal app without auth for now)
-- In a real production app with auth, you would restrict this to the user's ID
CREATE POLICY "Allow all actions for now" ON reels
  FOR ALL
  USING (true);

-- Create an index on tags for faster filtering
CREATE INDEX idx_reels_tags ON reels USING GIN (tags);
