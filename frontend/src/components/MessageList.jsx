import React, { useState } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Box,
  Snackbar,
  Button
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';

const MessageList = ({ messages }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);

  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setSnackMessage('Text copied to clipboard.');
    setSnackOpen(true);
  };

  const handleMoreClick = (event, idx) => {
    setAnchorEl(event.currentTarget);
    setSelectedIdx(idx);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedIdx(null);
  };

  const handleCloseSnackbar = (_, reason) => {
    if (reason === 'clickaway') return;
    setSnackOpen(false);
  };

  const snackbarAction = (
    <React.Fragment>
      <Button color="secondary" size="small" onClick={handleCloseSnackbar}>
        OK
      </Button>
      <IconButton size="small" color="inherit" onClick={handleCloseSnackbar}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </React.Fragment>
  );

  return (
    <Paper
      elevation={3}
      sx={{
        flex: 1,
        p: 2,
        mt: { xs: 4, lg: 0 },
      }}
    >
      <Typography variant="h6" gutterBottom>Generated Messages</Typography>
      {messages.length === 0 && (
        <Typography variant="body2" color="textSecondary">No messages yet.</Typography>
      )}
      <List dense sx={{ maxHeight: '80vh', minHeight: '60vh', overflowY: 'auto' }}>
        {messages.map((msg, idx) => (
          <React.Fragment key={idx}>
            <ListItem
              className='bg-light p-4 mb-2 rounded-3 border border-1'
              secondaryAction={
                <Box display="flex" alignItems="center">
                  <Tooltip title="Copy">
                    <IconButton edge="end" onClick={() => handleCopy(msg)}>
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="More">
                    <IconButton edge="end" onClick={(e) => handleMoreClick(e, idx)}>
                      <MoreVertIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            >
              <div className="col-11 pe-3">
                <ListItemText
                  primary={msg}
                  primaryTypographyProps={{ fontSize: '1rem' }}
                />
              </div>
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => { setSnackMessage("Edit clicked"); setSnackOpen(true); handleCloseMenu(); }}>
          Edit
        </MenuItem>
        <MenuItem onClick={() => { setSnackMessage("Delete clicked"); setSnackOpen(true); handleCloseMenu(); }}>
          Delete
        </MenuItem>
      </Menu>

      {/* Snackbar */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={snackMessage}
        action={snackbarAction}
        sx={{
          background:'white'
        }}
        // anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Paper>
  );
};

export default MessageList;
