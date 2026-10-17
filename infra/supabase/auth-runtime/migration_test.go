package utilities

import (
 "encoding/binary"
 "fmt"
 "testing"

 "github.com/jackc/pgx/v5/pgconn"
 "github.com/jackc/pgx/v5/pgproto3"
)

func TestCandidateRejectsInvalidDataRowLengths(t *testing.T) {
 for _, length := range []uint32{0x80000000, 0xfffffffe, 100} {
  payload := make([]byte, 6)
  binary.BigEndian.PutUint16(payload, 1)
  binary.BigEndian.PutUint32(payload[2:], length)
  var row pgproto3.DataRow
  if err := row.Decode(payload); err == nil {
   t.Fatalf("accepted invalid length %x", length)
  }
 }
 for _, payload := range [][]byte{{0,1,255,255,255,255}, {0,1,0,0,0,1,'a'}} {
  var row pgproto3.DataRow
  if err := row.Decode(payload); err != nil { t.Fatalf("valid row rejected: %v", err) }
 }
}

func TestCandidateMapsWrappedPgx5Errors(t *testing.T) {
 for _, code := range []string{"23505", "23503", "PT401"} {
  err := fmt.Errorf("wrapped: %w", &pgconn.PgError{Code:code, Message:"fictitious"})
  mapped := NewPostgresError(err)
  if mapped == nil || mapped.Code != code { t.Fatalf("lost PostgreSQL error %s", code) }
 }
}
