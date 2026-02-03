FOR BACKEND
1- Send the available days in with month and year, (el mhm a3rf a5od el current month and next 2 months at least )
{
"availableDays": [15, 16, 17, 20, 21, 22, ...],
"year": 2024,
"month": 11,

}
2- Send checked appointments Data. (7a5od kol el timestamps ely checked in timezone Africa/Cairo)
{
//"name": "Hazem Gad",
//"email": "hazemhgad22@gmail.com",
//"description": "Web design consultation",
"startTime": "2026-01-09T09:00:00",
//"endTime": "2026-01-09T10:00:00",
"timezone": "Africa/Cairo"
}
3- Send appointment duration and timestamps (15Min) from start time and end time (11:00 AM to 04:00 PM)
{
"appointmentDuration": "15min",
"startTime":"11:00AM",
"endTime":"04:00 PM",
"timezone":"Africa/Cairo"
}
4- 7b3tlk el Time and Timezone w 8yro L local time.
7b3tlk data bl4kl da (note time is still in Africa/Cairo)
{
"name": "Hazem Gad",
"email": "hazemhgad22@gmail.com",
"description": "Web design consultation",
"startTime": "2026-01-09T09:00:00",
"endTime": "2026-01-09T10:00:00",
"timezone": "Africa/Cairo"
}
FOR FRONTEND
1- Get the current Month and next 2 months available days un/available days
2- SHOW Dynamic timestamps between start and end time each will take the appointment duration ,
3- Block checked slots + block previous and next time
4- Change the timestamps to selected timezone
5- Post 'Name, description, email, startTime, endTime , Timezone'
resend me this enhanced if it needs
