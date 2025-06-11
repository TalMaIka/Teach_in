import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TextInput, Button } from 'react-native';

export default function TicketListScreen({ teacherId, studentId, userRole }) {
  const [tickets, setTickets] = useState([]);
  const [responseTexts, setResponseTexts] = useState({});

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        let url;
        if (userRole === 'student') {
          url = `http://10.0.2.2:3001/tickets/student/${studentId}`;
        } else if (userRole === 'teacher') {
          url = `http://10.0.2.2:3001/tickets/teacher/${teacherId}`;
        } else if (userRole === 'admin') {
          url = `http://10.0.2.2:3001/admin/tickets`;
        }

        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        setTickets(data);
      } catch (err) {
        console.error('Fetch error:', err);
        Alert.alert('Error', 'Could not load tickets: ' + err.message);
      }
    };

    if ((userRole === 'student' && studentId) ||
        (userRole === 'teacher' && teacherId) ||
        (userRole === 'admin')) {
      fetchTickets();
    }
  }, [teacherId, studentId, userRole]);

  const handleResponse = async (ticketId) => {
    const responseText = responseTexts[ticketId];
    if (!responseText?.trim()) {
      Alert.alert('Error', 'Please enter a response');
      return;
    }

    try {
      const res = await fetch(`http://10.0.2.2:3001/tickets/${ticketId}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: responseText }),
      });

      if (res.ok) {
        Alert.alert('Success', 'Response sent successfully');
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
    } catch (error) {
      Alert.alert('Network error', 'Could not send response');
      console.error('Response error:', error);
    }
  };

  const renderItem = ({ item }) => {
    const isStudent = userRole === 'student';
    const isTeacher = userRole === 'teacher';
    const isAdmin = userRole === 'admin';

    return (
      <View style={styles.ticket}>
        <Text style={styles.subject}>{item.subject}</Text>

        {isStudent && (
          <>
            <Text style={styles.info}>To: {item.teacher_name}</Text>
            <Text style={styles.info}>Message: {item.message}</Text>
            <Text style={styles.status}>Status: {item.response ? 'Answered' : 'Pending'}</Text>
          </>
        )}

        {isTeacher && (
          <>
            <Text style={styles.info}>From: {item.student_name}</Text>
            <Text style={styles.info}>Message: {item.message}</Text>
          </>
        )}

        {isAdmin && (
          <>
            <Text style={styles.info}>From: {item.student_name} → To: {item.teacher_name}</Text>
            <Text style={styles.info}>Message: {item.message}</Text>
            <Text style={styles.status}>Status: {item.response ? 'Answered' : 'Pending'}</Text>
          </>
        )}

        <Text style={styles.date}>Sent: {new Date(item.created_at).toLocaleString()}</Text>

        {item.response ? (
          <>
            <Text style={styles.responseLabel}>
              {isStudent ? "Teacher's Response:" : "Your Response:"}
            </Text>
            <Text style={styles.response}>{item.response}</Text>
            {item.responded_at && (
              <Text style={styles.date}>
                Responded: {new Date(item.responded_at).toLocaleString()}
              </Text>
            )}
          </>
        ) : (
          <>
            {isStudent && (
              <Text style={styles.waiting}>⏳ Waiting for teacher's response...</Text>
            )}

            {(isTeacher || isAdmin) && (
              <>
                <TextInput
                  placeholder="Write your response here..."
                  value={responseTexts[item.id] || ''}
                  onChangeText={(text) =>
                    setResponseTexts((prev) => ({ ...prev, [item.id]: text }))
                  }
                  style={styles.input}
                  multiline={true}
                  numberOfLines={3}
                />
                <Button
                  title="📤 Send Response"
                  onPress={() => handleResponse(item.id)}
                  color="#27ae60"
                />
              </>
            )}
          </>
        )}
      </View>
    );
  };

  const getTitle = () => {
    if (userRole === 'student') return '📋 My Tickets';
    if (userRole === 'teacher') return '📥 Tickets Received';
    if (userRole === 'admin') return '🔧 All Tickets';
    return 'Tickets';
  };

  const getEmptyMessage = () => {
    if (userRole === 'student') return 'You haven\'t sent any tickets yet.';
    if (userRole === 'teacher') return 'No tickets received yet.';
    if (userRole === 'admin') return 'No tickets in the system yet.';
    return 'No tickets found.';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getTitle()}</Text>

      {tickets.length === 0 ? (
        <Text style={styles.emptyMessage}>{getEmptyMessage()}</Text>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          style={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c3e50',
  },
  list: {
    flex: 1,
  },
  ticket: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e67e22',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
    marginTop: 10,
    marginBottom: 5,
  },
  response: {
    fontSize: 14,
    color: '#2c3e50',
    backgroundColor: '#e8f5e8',
    padding: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  waiting: {
    fontSize: 14,
    color: '#e67e22',
    fontStyle: 'italic',
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  emptyMessage: {
    textAlign: 'center',
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 50,
  },
});