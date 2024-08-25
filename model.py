# model.py
import pandas as pd
from prophet import Prophet
import yfinance as yf
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Use environment variable for API key
API_KEY = os.getenv('CRYPTOCOMPARE_API_KEY')

def fetch_data():
    end_date = datetime.now()
    start_date = end_date - timedelta(days=1095)  # 3 years of data
    df = yf.download('BTC-USD', start=start_date, end=end_date)
    df.reset_index(inplace=True)
    df = df[['Date', 'Close', 'Volume']]
    df.columns = ['ds', 'y', 'volume']
    return df

def train_model(df):
    model = Prophet(daily_seasonality=True)
    model.add_regressor('volume')
    model.fit(df)
    return model

def make_prediction(model, days_ahead, df):
    future_dates = model.make_future_dataframe(periods=days_ahead)
    future_dates['volume'] = df['volume'].tail(30).mean()
    forecast = model.predict(future_dates)
    return forecast

# Global variables to store model and last training time
global_model = None
global_df = None
last_train_time = None

def get_model():
    global global_model, global_df, last_train_time
    current_time = datetime.now()
    
    # Retrain model if it's None or if it's been more than a day since last training
    if global_model is None or global_df is None or last_train_time is None or (current_time - last_train_time) > timedelta(days=1):
        global_df = fetch_data()
        global_model = train_model(global_df)
        last_train_time = current_time
    
    return global_model, global_df