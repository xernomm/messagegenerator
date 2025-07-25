import React, { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Box } from '@mui/material';
import Form from '../components/Form';
import MessageList from "../components/MessageList"

const API_BASE = process.env.REACT_APP_API_BASE;

const Dashboard = () => {
  const [topic, setTopic] = useState('');
  const [messageNumbers, setMessageNumbers] = useState(5);
  const [reference, setReference] = useState('');
  const [language, setLanguage] = useState('English');
  const [style, setStyle] = useState('neutral');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();

    if (!topic || messageNumbers <= 0) {
      Swal.fire('Error', 'Topic dan jumlah message wajib diisi', 'error');
      return;
    }

    setLoading(true);
    setMessages([]);

    try {
      const { data } = await axios.post(`${API_BASE}/generate`, {
        topic,
        message_numbers: Number(messageNumbers),
        reference,
        language,
        style,
      });

      setMessages(data.results);
      Swal.fire('Sukses', `Berhasil generate ${data.results.length} pesan`, 'success');
    } catch (error) {
      Swal.fire('Error', error?.response?.data?.error || 'Terjadi kesalahan', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="container vh-100 d-lg-flex align-items-center justify-content-center p-3 gap-4">
      <Form
        topic={topic}
        setTopic={setTopic}
        messageNumbers={messageNumbers}
        setMessageNumbers={setMessageNumbers}
        reference={reference}
        setReference={setReference}
        language={language}
        setLanguage={setLanguage}
        style={style}
        setStyle={setStyle}
        onGenerate={handleGenerate}
        loading={loading}
      />
      <MessageList messages={messages} />
    </Box>
  );
};

export default Dashboard;
