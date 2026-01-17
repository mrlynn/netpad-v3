'use client';

import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  alpha,
  Button,
} from '@mui/material';
import {
  ArrowForward,
  Schedule,
  AutoAwesome,
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { useAuth } from '@/contexts/AuthContext';

// Blog posts data
const blogPosts = [
  {
    slug: 'conversational-forms-for-developers',
    title: 'Conversational Forms for Developers: Schema, Logic, and Automation',
    excerpt: "The technical deep-dive: defining schemas, configuring conversation flow, adding conditional logic, connecting to workflows, and deploying to production.",
    category: 'Technical',
    readTime: '12 min read',
    date: 'January 2025',
    featured: false,
    series: 'Part 2',
    image: '/netpad-thinking-2.png',
  },
  {
    slug: 'conversational-forms-101',
    title: 'Conversational Forms 101: The Business Case for Better Data Capture',
    excerpt: "You've probably seen this: A user lands on your signup form. They see 10 fields. Their eyes glaze over. They close the tab. What if you didn't have to choose between structured data and natural conversation?",
    category: 'Product',
    readTime: '8 min read',
    date: 'January 2025',
    featured: true,
    series: 'Part 1',
    image: '/netpad-typing.png',
  },
];

export default function BlogIndexPage() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#001E2B' }}>
      {!isLoading && isAuthenticated && <AppNavBar />}

      {/* Hero */}
      <Box
        sx={{
          pt: { xs: 8, md: 12 },
          pb: { xs: 6, md: 8 },
          background: `radial-gradient(ellipse at top, rgba(0, 237, 100, 0.1) 0%, transparent 60%)`,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '2rem', md: '2.5rem' },
                fontWeight: 700,
                color: '#fff',
                mb: 2,
              }}
            >
              NetPad Blog
            </Typography>
            <Typography
              sx={{
                color: alpha('#fff', 0.7),
                maxWidth: 600,
                mx: 'auto',
                fontSize: '1.1rem',
              }}
            >
              Insights on forms, data collection, conversational AI, and building better user experiences with MongoDB.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Blog Posts */}
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <Box sx={{ display: 'grid', gap: 4 }}>
          {blogPosts.map((post) => (
            <Paper
              key={post.slug}
              component={Link}
              href={`/blog/${post.slug}`}
              elevation={0}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '300px 1fr' },
                gap: 4,
                p: 4,
                bgcolor: alpha('#fff', 0.02),
                border: '1px solid',
                borderColor: alpha('#fff', 0.1),
                borderRadius: 3,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: alpha('#fff', 0.04),
                  borderColor: alpha('#00ED64', 0.3),
                  transform: 'translateY(-2px)',
                },
              }}
            >
              {/* Image */}
              <Box
                sx={{
                  position: 'relative',
                  height: { xs: 200, md: 200 },
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: alpha('#00ED64', 0.1),
                }}
              >
                {post.image ? (
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                    }}
                  >
                    <AutoAwesome sx={{ fontSize: 48, color: '#00ED64' }} />
                  </Box>
                )}
              </Box>

              {/* Content */}
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {post.featured && (
                    <Chip
                      label="Featured"
                      size="small"
                      sx={{
                        bgcolor: alpha('#00ED64', 0.15),
                        color: '#00ED64',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  )}
                  {post.series && (
                    <Chip
                      label={post.series}
                      size="small"
                      sx={{
                        bgcolor: alpha('#9C27B0', 0.15),
                        color: '#9C27B0',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  )}
                  <Chip
                    label={post.category}
                    size="small"
                    sx={{
                      bgcolor: alpha('#fff', 0.1),
                      color: alpha('#fff', 0.7),
                      fontSize: '0.7rem',
                    }}
                  />
                </Box>

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: '#fff',
                    mb: 2,
                    lineHeight: 1.3,
                  }}
                >
                  {post.title}
                </Typography>

                <Typography
                  sx={{
                    color: alpha('#fff', 0.6),
                    mb: 3,
                    lineHeight: 1.7,
                    flex: 1,
                  }}
                >
                  {post.excerpt}
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: alpha('#fff', 0.5) }}
                    >
                      {post.date}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        color: alpha('#fff', 0.5),
                      }}
                    >
                      <Schedule sx={{ fontSize: 14 }} />
                      <Typography variant="body2">{post.readTime}</Typography>
                    </Box>
                  </Box>

                  <Button
                    endIcon={<ArrowForward />}
                    sx={{
                      color: '#00ED64',
                      fontWeight: 600,
                      '&:hover': { bgcolor: alpha('#00ED64', 0.1) },
                    }}
                  >
                    Read Article
                  </Button>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      </Container>

      {/* Footer CTA */}
      <Box
        sx={{
          py: 8,
          borderTop: '1px solid',
          borderColor: alpha('#fff', 0.1),
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: '#fff', mb: 2 }}
            >
              Ready to try conversational forms?
            </Typography>
            <Typography
              sx={{ color: alpha('#fff', 0.6), mb: 4, maxWidth: 500, mx: 'auto' }}
            >
              See the difference yourself. Try our live demo or join the waitlist for early access.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                component={Link}
                href="/demo/conversational"
                variant="outlined"
                size="large"
                sx={{
                  px: 4,
                  borderColor: alpha('#00ED64', 0.5),
                  color: '#00ED64',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#00ED64',
                    bgcolor: alpha('#00ED64', 0.1),
                  },
                }}
              >
                Try the Demo
              </Button>
              <Button
                component={Link}
                href="/auth/login"
                variant="contained"
                size="large"
                sx={{
                  px: 4,
                  bgcolor: '#00ED64',
                  color: '#001E2B',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#00CC55' },
                }}
              >
                Join the Waitlist
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
