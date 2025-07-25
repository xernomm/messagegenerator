import React, { useState } from 'react';
import {
  Box, TextField, MenuItem, Button, IconButton, CircularProgress, LinearProgress
} from '@mui/material';
import { UploadFile, Delete } from '@mui/icons-material';
import Swal from 'sweetalert2';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE;

const Form = ({
  topic, setTopic,
  messageNumbers, setMessageNumbers,
  reference, setReference,
  language, setLanguage,
  style, setStyle,
  onGenerate,
  loading
}) => {

const handleUpload = async (e) => {
  const file = e.target.files[0];
  if (!file || !file.name.endsWith('.pdf')) {
    Swal.fire('Error', 'Hanya file PDF yang diizinkan', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  setUploading(true);

  try {
    const response = await axios.post(`${API_BASE}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const uploadedName = file.name;
    Swal.fire('Upload Berhasil', response.data.message, 'success');
    setReference(uploadedName);
  } catch (err) {
    Swal.fire('Error', err?.response?.data?.error || 'Gagal upload file', 'error');
  } finally {
    setUploading(false);
  }
};


const handleClearReference = async () => {
  if (!reference) return;

  const source = reference.startsWith("file#") || reference.startsWith("text#") ? reference : `file#${reference}`;

  const confirmed = await Swal.fire({
    title: "Delete reference?",
    text: `This will delete all context and files related to: ${source}`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (!confirmed.isConfirmed) return;

  try {
    const res = await axios.delete(`${process.env.REACT_APP_API_BASE}/delete`, {
      data: { source },
    });

    Swal.fire("Deleted!", "Reference deleted", "success");
    setReference(""); // clear reference after deletion
  } catch (error) {
    console.error("❌ Failed to delete:", error);
    Swal.fire("Error", "Failed to delete reference.", "error");
  }
};

// Buffer loader state
const [uploading, setUploading] = useState(false);
const [progress, setProgress] = React.useState(0);
const [buffer, setBuffer] = React.useState(10);

// Buffer logic
const progressRef = React.useRef(() => {});
React.useEffect(() => {
  progressRef.current = () => {
    if (progress >= 100) {
      setProgress(0);
      setBuffer(10);
    } else {
      setProgress((prev) => Math.min(prev + 1, 100));
      if (buffer < 100 && progress % 5 === 0) {
        const newBuffer = buffer + 1 + Math.random() * 10;
        setBuffer(newBuffer > 100 ? 100 : newBuffer);
      }
    }
  };
}, [progress, buffer]);

React.useEffect(() => {
  if (!uploading && !loading) return;
  const timer = setInterval(() => {
    progressRef.current();
  }, 100);
  return () => clearInterval(timer);
}, [uploading, loading]);



  return (
    <Box
      component="form"
      onSubmit={onGenerate}
      sx={{ flex: 1, maxWidth: '600px', display: 'flex', flexDirection: 'column' }}
      className='card p-3'
    >
      <p className="fw-bold lead mb-3">
        Prompt Settings
      </p>
      <hr />
      <div className="d-flex col-12 justify-content-between align-items-center">

        <TextField
          label="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          required
          margin="normal"
          sx={{
            width: '58%',
          }}
        />

        <TextField
          label="Number of Messages"
          type="number"
          value={messageNumbers}
          onChange={(e) => setMessageNumbers(e.target.value)}
          inputProps={{ min: 1 }}
          required
          margin="normal"
          sx={{
            width: '41%',
          }}
        />
      </div>

      <Box display="flex" alignItems="center" gap={1} mt={2}>
        <TextField
          multiline
          id="outlined-textarea"
          label="Reference (Optional)"
          value={reference}
          maxRows={8}
          onChange={(e) => setReference(e.target.value)}
          sx={{
            width: '100%',
          }}
        />



        {reference && (
          <IconButton onClick={handleClearReference} color="error">
            <Delete />
          </IconButton>
        )}
        {!reference && (

        <Button
          variant="contained"
          color='success'
          component="label"
          startIcon={<UploadFile />}
          className="py-3"
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload'}
          <input type="file" hidden onChange={handleUpload} />
        </Button>
        )}
        
      </Box>


        
      <div className="d-flex col-12 align-items-center justify-content-between">
        <TextField
          select
          label="Language"
          value={language}
          sx={{
            width: '49%',
          }}
          onChange={(e) => setLanguage(e.target.value)}
          margin="normal"
        >
          <MenuItem value="English">English</MenuItem>
          <MenuItem value="Indonesia">Indonesia</MenuItem>
          <MenuItem value="French">French</MenuItem>
          <MenuItem value="Spanish">Spanish</MenuItem>
        </TextField>

        <TextField
          select
          label="Style"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          margin="normal"
          sx={{
            width: '50%',
          }}
        >
          <MenuItem value="neutral">neutral</MenuItem>
          <MenuItem value="friendly">friendly</MenuItem>
          <MenuItem value="professional">professional</MenuItem>
          <MenuItem value="casual">casual</MenuItem>
        </TextField>

      </div>


        {(uploading || loading) && (
          <Box sx={{ width: '100%', mt: 1 }}>
            <LinearProgress variant="buffer" value={progress} valueBuffer={buffer} />
          </Box>
        )}

      <Button
        type="submit"
        variant="contained"
        color="primary"
        sx={{ mt: 3 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : 'Generate'}
      </Button>
    </Box>
  );
};

export default Form;
