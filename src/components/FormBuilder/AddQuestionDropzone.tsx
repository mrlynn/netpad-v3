'use client';

import { useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  alpha,
  Fade,
} from '@mui/material';
import { Add } from '@mui/icons-material';

interface AddQuestionDropzoneProps {
  onAdd: () => void;
  visible?: boolean;
}

export function AddQuestionDropzone({
  onAdd,
  visible = false,
}: AddQuestionDropzoneProps) {
  const [isHovered, setIsHovered] = useState(false);
  const showButton = visible || isHovered;

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        position: 'relative',
        height: showButton ? 40 : 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'height 0.2s ease',
        cursor: 'pointer',
      }}
      onClick={onAdd}
    >
      {/* Subtle line indicator */}
      <Box
        sx={{
          position: 'absolute',
          left: 24,
          right: 24,
          height: 2,
          borderRadius: 1,
          bgcolor: showButton ? alpha('#00ED64', 0.3) : 'transparent',
          transition: 'background-color 0.2s ease',
        }}
      />

      {/* Add button */}
      <Fade in={showButton}>
        <Tooltip title="Add question here" placement="top">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            sx={{
              bgcolor: 'background.paper',
              border: '2px solid',
              borderColor: '#00ED64',
              color: '#00ED64',
              width: 28,
              height: 28,
              boxShadow: 2,
              '&:hover': {
                bgcolor: '#00ED64',
                color: '#001E2B',
              },
            }}
          >
            <Add sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Fade>
    </Box>
  );
}
