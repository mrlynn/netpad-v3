/**
 * CreateButton - Enhanced create button with template option
 * 
 * A split button that offers:
 * - Primary action: Create blank item
 * - Dropdown: "From Template" option
 */

'use client';

import { useState, useRef } from 'react';
import {
  Button,
  ButtonGroup,
  Popper,
  Grow,
  Paper,
  ClickAwayListener,
  MenuList,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add,
  ArrowDropDown,
  Description as TemplateIcon,
  NoteAdd as BlankIcon,
} from '@mui/icons-material';
import Link from 'next/link';

interface CreateButtonProps {
  /** Label for the button (e.g., "Create Form", "Create Workflow") */
  label: string;
  /** URL for creating a blank item (use this OR onClick, not both) */
  createHref?: string;
  /** Click handler for creating a blank item (use this OR createHref, not both) */
  onCreate?: () => void;
  /** URL for template gallery */
  templateHref: string;
  /** Optional: Custom icon for the button */
  icon?: React.ReactNode;
  /** Optional: Button color */
  color?: 'primary' | 'secondary' | 'inherit';
  /** Optional: Custom styles */
  sx?: object;
}

export function CreateButton({
  label,
  createHref,
  onCreate,
  templateHref,
  icon = <Add />,
  color = 'primary',
  sx = {},
}: CreateButtonProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
      return;
    }
    setOpen(false);
  };

  return (
    <>
      <ButtonGroup
        variant="contained"
        ref={anchorRef}
        aria-label={`${label} options`}
        sx={{
          boxShadow: 'none',
          '& .MuiButtonGroup-grouped': {
            borderColor: 'rgba(255,255,255,0.2)',
          },
          ...sx,
        }}
        color={color}
      >
        <Button
          {...(createHref ? { component: Link, href: createHref } : { onClick: onCreate })}
          startIcon={icon}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
          }}
        >
          {label}
        </Button>
        <Button
          size="small"
          aria-controls={open ? 'create-button-menu' : undefined}
          aria-expanded={open ? 'true' : undefined}
          aria-label="select create option"
          aria-haspopup="menu"
          onClick={handleToggle}
          sx={{ px: 0.5 }}
        >
          <ArrowDropDown />
        </Button>
      </ButtonGroup>
      <Popper
        sx={{ zIndex: 1300 }}
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        placement="bottom-end"
      >
        {({ TransitionProps }) => (
          <Grow {...TransitionProps}>
            <Paper elevation={8} sx={{ minWidth: 200, mt: 0.5 }}>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList id="create-button-menu" autoFocusItem>
                  <MenuItem
                    {...(createHref ? { component: Link, href: createHref } : {})}
                    onClick={() => {
                      setOpen(false);
                      if (onCreate) onCreate();
                    }}
                  >
                    <ListItemIcon>
                      <BlankIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Blank</ListItemText>
                  </MenuItem>
                  <MenuItem
                    component={Link}
                    href={templateHref}
                    onClick={() => setOpen(false)}
                  >
                    <ListItemIcon>
                      <TemplateIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>From Template</ListItemText>
                  </MenuItem>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
}

export default CreateButton;
