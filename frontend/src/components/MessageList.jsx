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
  Button,
  Modal,
  TextField
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

const MessageList = ({ messages }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);

  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');

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

  const handleSendMessage = async () => {
    try {
      await axios.post('http://localhost:5000/send', {
        phone_numbers: phoneInput.split(',').map((p) => p.trim()),
        message: messages[selectedIdx],
      });
      setSnackMessage('Pesan dikirim melalui WhatsApp');
      setSnackOpen(true);
      setModalOpen(false);
    } catch (error) {
      setSnackMessage('Gagal mengirim pesan');
      setSnackOpen(true);
    }
  };

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
        <MenuItem onClick={() => { handleCloseMenu(); setModalOpen(true); }}>
          <SendIcon fontSize="small" sx={{ mr: 1 }} /> Kirim WA
        </MenuItem>
      </Menu>

      {/* Modal Send WA */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" gutterBottom>Kirim Pesan WhatsApp</Typography>
          <TextField
            label="Nomor Tujuan (pisahkan dengan koma)"
            fullWidth
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            margin="normal"
            placeholder="Contoh: 6281234567890,628111112222"
          />
          <TextField
            label="Pesan"
            fullWidth
            multiline
            value={messages[selectedIdx] || ''}
            margin="normal"
            InputProps={{ readOnly: true }}
          />
          <Box textAlign="right" mt={2}>
            <Button variant="contained" onClick={handleSendMessage}>Kirim</Button>
          </Box>
        </Box>
      </Modal>

      {/* Snackbar */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={snackMessage}
        action={snackbarAction}
      />
    </Paper>
  );
};

export default MessageList;