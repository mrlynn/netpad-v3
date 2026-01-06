'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  AppBar,
  Toolbar,
  Alert,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
} from '@mui/material';
import { Search as SearchIcon, ArrowBack, Visibility, Edit } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { FormRenderer } from '@netpad/forms';

// Import the search form configuration
import { itHelpdeskSearchFormConfig } from '../../../templates/search-form';

/**
 * IT Ticket Search Page
 * 
 * This page demonstrates how to use the search form configuration
 * to create a ticket search interface. In a production application,
 * you would connect this to your MongoDB backend to perform actual searches.
 */
export default function SearchTicketsPage() {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (searchData: Record<string, unknown>) => {
    setIsSearching(true);
    setHasSearched(true);
    
    // In a real application, you would send this to your backend API
    // Example:
    // const response = await fetch('/api/tickets/search', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(searchData),
    // });
    // const results = await response.json();
    // setSearchResults(results);
    
    // For demo purposes, we'll simulate a search
    setTimeout(() => {
      // Mock results - replace with actual API call
      setSearchResults([
        {
          _id: '1',
          fullName: 'John Doe',
          email: 'john.doe@company.com',
          department: 'Engineering',
          issueCategory: 'hardware',
          urgencyLevel: 'high',
          subject: 'Laptop screen not working',
          description: 'My laptop screen went black this morning and won\'t turn on.',
          createdAt: new Date().toISOString(),
        },
        {
          _id: '2',
          fullName: 'Jane Smith',
          email: 'jane.smith@company.com',
          department: 'Sales',
          issueCategory: 'software',
          urgencyLevel: 'medium',
          subject: 'Cannot access CRM system',
          description: 'Getting 404 error when trying to access the CRM dashboard.',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
      setIsSearching(false);
    }, 1000);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '🚨 Critical';
      case 'high': return '🔴 High';
      case 'medium': return '🟡 Medium';
      case 'low': return '🟢 Low';
      default: return urgency;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      hardware: 'Hardware',
      software: 'Software',
      network: 'Network / Connectivity',
      access: 'Access & Permissions',
      other: 'Other',
    };
    return labels[category] || category;
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Button
            color="inherit"
            startIcon={<ArrowBack />}
            onClick={() => router.push('/')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <SearchIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Search Tickets
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Search IT Support Tickets
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Use the filters below to search for tickets by category, urgency, department, or keywords.
            Smart dropdowns show actual values from your ticket database with counts.
          </Typography>

          {/* Search Form */}
          <FormRenderer
            config={itHelpdeskSearchFormConfig}
            onSubmit={handleSearch}
            mode="create"
          />
        </Paper>

        {/* Search Results */}
        {hasSearched && (
          <Box>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              Search Results {searchResults.length > 0 && `(${searchResults.length} found)`}
            </Typography>

            {isSearching ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography>Searching tickets...</Typography>
              </Paper>
            ) : searchResults.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No tickets found matching your search criteria.
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {searchResults.map((ticket) => (
                  <Grid item xs={12} md={6} key={ticket._id}>
                    <Card elevation={2}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6" component="h3">
                            {ticket.subject}
                          </Typography>
                          <Chip
                            label={getUrgencyLabel(ticket.urgencyLevel)}
                            color={getUrgencyColor(ticket.urgencyLevel) as any}
                            size="small"
                          />
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <strong>Reporter:</strong> {ticket.fullName} ({ticket.department})
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <strong>Email:</strong> {ticket.email}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <strong>Category:</strong> {getCategoryLabel(ticket.issueCategory)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Submitted:</strong>{' '}
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>

                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {ticket.description}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => {
                              // In production, navigate to ticket detail page
                              console.log('View ticket:', ticket._id);
                            }}
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Edit />}
                            onClick={() => {
                              // In production, navigate to ticket edit page
                              console.log('Edit ticket:', ticket._id);
                            }}
                          >
                            Edit
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* Integration Note */}
        {!hasSearched && (
          <Paper sx={{ p: 3, mt: 4, bgcolor: 'info.light', color: 'info.contrastText' }}>
            <Typography variant="body2">
              <strong>Note:</strong> This is a demo search interface. To connect to your MongoDB
              backend, update the <code>handleSearch</code> function in this file to call your API
              endpoint. The search form configuration supports smart dropdowns that automatically
              fetch distinct values from your database.
            </Typography>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
