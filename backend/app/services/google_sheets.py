"""Google Sheets service for reading and writing ad data."""

from typing import Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


class GoogleSheetsService:
    """Handle Google Sheets API operations."""
    
    def __init__(self):
        self.sheet_name = "Ad_Log"
        self.column = "D"
    
    def get_last_ad_number(self, credentials: Credentials, spreadsheet_id: str) -> int:
        """Get the last ad number from column D in the Ad_Log sheet.
        
        Reads column D, extracts the first 4 digits from each cell,
        and returns max(numbers) + 1.
        
        Args:
            credentials: Google OAuth credentials
            spreadsheet_id: The ID of the Google Sheet
            
        Returns:
            The next ad number to use (last + 1, or 1 if sheet is empty)
            
        Raises:
            HttpError: If the API request fails
        """
        try:
            service = build('sheets', 'v4', credentials=credentials)
            
            # Read all values from column D in Ad_Log sheet
            range_name = f"{self.sheet_name}!{self.column}:{self.column}"
            result = service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            
            if not values:
                return 1
            
            # Extract numbers from the first 4 characters of each cell
            numbers = []
            for row in values:
                if not row or not row[0]:  # Skip empty cells
                    continue
                    
                cell_value = str(row[0]).strip()
                
                # Skip header or non-numeric starts
                if not cell_value or not cell_value[0].isdigit():
                    continue
                
                # Extract first 4 characters and try to parse as int
                try:
                    # Get first 4 digits
                    first_four = cell_value[:4]
                    ad_number = int(first_four)
                    numbers.append(ad_number)
                except (ValueError, IndexError):
                    # Skip cells that don't start with valid numbers
                    continue
            
            # Return max + 1, or 1 if no valid numbers found
            return max(numbers) + 1 if numbers else 1
            
        except HttpError as error:
            print(f"An error occurred: {error}")
            raise
    
    def paste_ad_names(
        self, 
        credentials: Credentials, 
        spreadsheet_id: str, 
        ad_names: list[str]
    ) -> dict:
        """Paste ad names to column D in the Ad_Log sheet.
        
        Appends the ad names to the first empty row in column D.
        
        Args:
            credentials: Google OAuth credentials
            spreadsheet_id: The ID of the Google Sheet
            ad_names: List of ad names to paste
            
        Returns:
            Dict with success status and count of rows added
            
        Raises:
            HttpError: If the API request fails
        """
        try:
            service = build('sheets', 'v4', credentials=credentials)
            
            # First, find the first empty row in column D
            range_name = f"{self.sheet_name}!{self.column}:{self.column}"
            result = service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=range_name
            ).execute()
            
            existing_values = result.get('values', [])
            # +1 for 1-indexed rows, +1 to get the row after last filled
            first_empty_row = len(existing_values) + 1
            
            # Prepare data in the format required by Sheets API
            # Each ad name is a row with a single column value
            values = [[name] for name in ad_names]
            
            # Append the data starting at the first empty row
            append_range = f"{self.sheet_name}!{self.column}{first_empty_row}"
            body = {
                'values': values
            }
            
            result = service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=append_range,
                valueInputOption='RAW',
                body=body
            ).execute()
            
            updated_cells = result.get('updatedCells', 0)
            
            return {
                'success': True,
                'rows_added': len(ad_names),
                'first_row': first_empty_row,
                'updated_cells': updated_cells
            }
            
        except HttpError as error:
            print(f"An error occurred: {error}")
            raise


# Global instance
google_sheets_service = GoogleSheetsService()
