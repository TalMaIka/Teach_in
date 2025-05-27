import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TextInput, Button } from 'react-native';

export default function TicketListScreen({ teacherId }) {
  const [tickets, setTickets] = useState([]);
  const [responseTexts, setResponseTexts] = useState({}); // 🟩 תשובות לפי ticket ID

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await fetch(`http://10.0.2.2:3001/tickets/${teacherId}`);
        const data = await res.json();
        setTickets(data);
      } catch (err) {
        Alert.alert('Error', 'Could not load tickets.');
      }
    };

    fetchTickets();
  }, []);

  const handleResponse = async (ticketId) => {
    const responseText = responseTexts[ticketId];
    if (!responseText?.trim()) return;

    try {
      const res = await fetch(`http://10.0.2.2:3001/tickets/${ticketId}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: responseText }),
      });

      if (res.ok) {
        Alert.alert('Response sent');
        setTickets((prevTickets) =>
          prevTickets.map((ticket) =>
            ticket.id === ticketId
              ? { ...ticket, response: responseText, responded_at: new Date().toISOString() }
              : ticket
          )
        );
        setResponseTexts((prev) => ({ ...prev, [ticketId]: '' }));
      } else {
        const errorText = await res.text();
        Alert.alert('Error', errorText);
      }
    } catch {
      Alert.alert('Network error');
    }
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.ticket}>
        <Text style={styles.subject}>{item.subject}</Text>
        <Text>From: {item.student_name}</Text>
        <Text>Message: {item.message}</Text>
        <Text style={styles.date}>Sent at: {new Date(item.created_at).toLocaleString()}</Text>

        {item.response ? (
          <>
            <Text style={styles.responseLabel}>Response:</Text>
            <Text>{item.response}</Text>
            <Text style={styles.date}>Responded at: {new Date(item.responded_at).toLocaleString()}</Text>
          </>
        ) : (
          <>
            <TextInput
              placeholder="Write a response..."
              value={responseTexts[item.id] || ''}
              onChangeText={(text) =>
                setResponseTexts((prev) => ({ ...prev, [item.id]: text }))
              }
              style={styles.input}
            />
            <Button title="Send Response" onPress={() => handleResponse(item.id)} />
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tickets Received</Text>
      <FlatList
        data={tickets}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<Text>No tickets received.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  ticket: { padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 10 },
  subject: { fontWeight: 'bold', fontSize: 16 },
  date: { fontSize: 12, color: '#999' },
  responseLabel: { fontWeight: 'bold', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, marginTop: 10, marginBottom: 10 },
});
