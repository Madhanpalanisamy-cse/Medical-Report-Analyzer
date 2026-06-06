db.query(
`
INSERT INTO chat_history
(
user_id,
question,
answer
)
VALUES(?,?,?)
`,
[
1,
message,
response
]
);